"""All mutations run through one reserved-concurrency=1 Lambda, including manual commands.

State is persisted BEFORE each mutation. No resource or personal data is deleted.
"""
import json
import os
from datetime import datetime, timezone
from decimal import Decimal

THRESHOLDS = (5, 10, 15, 25)
POLICY = "portfolio-cost-stop-bedrock"
BEDROCK_STOP_ACTIONS = ["bedrock:*", "bedrock-mantle:*"]
BLOCK_FILTER = [[{"type": "EVENT", "pattern": "PUSH"},
                 {"type": "ACTOR_ACCOUNT_ID", "pattern": "^$"}]]
_controller = None


class Controller:
    def __init__(self, session, config, bucket):
        self.config, self.bucket = config, bucket
        self.s3 = session.client("s3", region_name="ap-northeast-1")
        self.clients = {}
        self.session = session
        self.key = "controller/state.json"

    def client(self, service):
        if service not in self.clients:
            self.clients[service] = self.session.client(service, region_name="ap-northeast-1")
        return self.clients[service]

    def load(self):
        try:
            return json.loads(self.s3.get_object(Bucket=self.bucket, Key=self.key)["Body"].read())
        except self.s3.exceptions.NoSuchKey:
            return None

    def save(self, state):
        self.s3.put_object(Bucket=self.bucket, Key=self.key,
                           Body=json.dumps(state).encode(), ContentType="application/json")

    def spend(self):
        # Same cost definition as the triggering budgets; no paid Cost Explorer polling.
        amounts = []
        for threshold in THRESHOLDS:
            budget = self.client("budgets").describe_budget(
                AccountId=self.config["account"], BudgetName=f"portfolio-stop-{threshold}")["Budget"]
            amounts.append(Decimal(budget["CalculatedSpend"]["ActualSpend"]["Amount"]))
        return max(amounts)

    def resources(self):
        return ([{"kind": "lambda", "id": n} for n in self.config["functions"]]
                + [{"kind": "bedrock", "id": n} for n in self.config["roles"]]
                + [{"kind": "pipeline", "id": n} for n in self.config["pipelines"]]
                + [{"kind": "webhook", "id": n} for n in self.config["webhooks"]]
                + [{"kind": "cloudfront", "id": n} for n in self.config["distributions"]])

    def snapshot(self, resource):
        kind, name = resource["kind"], resource["id"]
        if kind == "lambda":
            return self.client("lambda").get_function_concurrency(FunctionName=name).get("ReservedConcurrentExecutions")
        if kind == "bedrock":
            iam = self.client("iam")
            try:
                iam.get_role_policy(RoleName=name, PolicyName=POLICY)
            except iam.exceptions.NoSuchEntityException:
                return False
            raise RuntimeError(f"Reserved policy name already exists on {name}; refusing overwrite")
        if kind == "pipeline":
            stages = self.client("codepipeline").get_pipeline_state(name=name)["stageStates"]
            return {s["stageName"]: s["inboundTransitionState"]["enabled"]
                    for s in stages if s["stageName"] != "Source"}
        if kind == "webhook":
            projects = self.client("codebuild").batch_get_projects(names=[name])["projects"]
            if len(projects) != 1 or not projects[0].get("webhook", {}).get("filterGroups"):
                raise RuntimeError(f"Expected existing filtered webhook on {name}")
            return projects[0]["webhook"]["filterGroups"]
        if kind == "cloudfront":
            return self.client("cloudfront").get_distribution_config(Id=name)["DistributionConfig"]["Enabled"]
        raise ValueError(kind)

    def change(self, resource, restore=False):
        kind, name, original = resource["kind"], resource["id"], resource["original"]
        if kind == "lambda":
            client = self.client("lambda")
            if restore and original is None:
                client.delete_function_concurrency(FunctionName=name)
            else:
                client.put_function_concurrency(FunctionName=name, ReservedConcurrentExecutions=original if restore else 0)
        elif kind == "bedrock":
            client = self.client("iam")
            if restore:
                try:
                    client.delete_role_policy(RoleName=name, PolicyName=POLICY)
                except client.exceptions.NoSuchEntityException:
                    pass
            else:
                client.put_role_policy(RoleName=name, PolicyName=POLICY, PolicyDocument=json.dumps({
                    "Version": "2012-10-17", "Statement": [{"Effect": "Deny", "Action": BEDROCK_STOP_ACTIONS, "Resource": "*"}]}))
        elif kind == "pipeline":
            client = self.client("codepipeline")
            for stage, enabled in original.items():
                args = dict(pipelineName=name, stageName=stage, transitionType="Inbound")
                if restore and enabled:
                    client.enable_stage_transition(**args)
                else:
                    client.disable_stage_transition(**args, reason="Portfolio cost stop")
        elif kind == "webhook":
            self.client("codebuild").update_webhook(projectName=name, filterGroups=original if restore else BLOCK_FILTER)
        elif kind == "cloudfront":
            client = self.client("cloudfront")
            latest = client.get_distribution_config(Id=name)
            desired = original if restore else False
            if latest["DistributionConfig"]["Enabled"] != desired:
                latest["DistributionConfig"]["Enabled"] = desired
                client.update_distribution(Id=name, IfMatch=latest["ETag"], DistributionConfig=latest["DistributionConfig"])

    def quiesce(self):
        # Never resume an old release by re-enabling a stage transition.
        pipeline = self.client("codepipeline")
        pending = False
        for name in self.config["pipelines"]:
            for page in pipeline.get_paginator("list_pipeline_executions").paginate(pipelineName=name):
                for execution in page["pipelineExecutionSummaries"]:
                    if execution["status"] in ("InProgress", "Stopping"):
                        if execution["status"] == "InProgress":
                            pipeline.stop_pipeline_execution(pipelineName=name,
                                pipelineExecutionId=execution["pipelineExecutionId"], abandon=False,
                                reason="Portfolio cost stop; do not resume old release")
                        pending = True
        build = self.client("codebuild")
        active = []
        for name in self.config["projects"]:
            for page in build.get_paginator("list_builds_for_project").paginate(projectName=name):
                ids = page.get("ids", [])
                for offset in range(0, len(ids), 100):
                    builds = build.batch_get_builds(ids=ids[offset:offset + 100])["builds"]
                    active.extend(b["id"] for b in builds if b["buildStatus"] == "IN_PROGRESS")
        for build_id in active:
            build.stop_build(id=build_id)
        if active or pending:
            raise RuntimeError("Pipeline/build stop requested; retry after they stop. Transitions remain blocked.")

    def run(self, event, now=None):
        now = now or datetime.now(timezone.utc)
        month = now.strftime("%Y-%m")
        state = self.load()
        action = event.get("action")
        threshold = None
        if "Records" in event:
            if len(event["Records"]) != 1:
                raise ValueError("Expected one SNS notification")
            sns = event["Records"][0]["Sns"]
            topic = sns["TopicArn"]
            topics = self.config["topics"]
            if topic not in topics:
                raise ValueError("Untrusted topic")
            timestamp = datetime.fromisoformat(sns["Timestamp"].replace("Z", "+00:00"))
            if timestamp.strftime("%Y-%m") != month:
                return {"status": "ignored-old-period"}
            if state and state.get("resume_at") and timestamp <= datetime.fromisoformat(state["resume_at"]):
                return {"status": "ignored-before-resume"}
            threshold, action = int(topics[topic]), "off"
        if action not in ("status", "initialize", "off", "on"):
            raise ValueError("Expected status, initialize, off or on")
        if action == "status":
            return {"state": state, "actual_usd": str(self.spend())}
        if state is None:
            if action != "initialize":
                raise RuntimeError("Initialize with a reviewed current-month baseline before arming notifications")
            state = {"month": month, "consumed": [], "resources": [], "mode": "on"}
        elif action == "initialize":
            raise RuntimeError("Already initialized; use on/off")
        if state["month"] != month:
            # Do not clear resource snapshots or automatically restore anything.
            state.update(month=month, consumed=[], seen=0)
        if threshold is not None:
            if threshold in state["consumed"]:
                return {"status": "ignored-consumed"}
            if state["mode"] == "restoring":
                raise RuntimeError("Restore incomplete; retry after recovery")
        if action in ("initialize", "on"):
            baseline = max(self.spend(), Decimal(str(event.get("baseline_usd", "0"))), Decimal(state.get("seen", 0)))
            state["consumed"] = sorted(set(state["consumed"]) | {t for t in THRESHOLDS if Decimal(t) <= baseline})
            state["mode"] = "restoring"
            state["resume_at"] = now.isoformat()
            self.save(state)  # Consume old thresholds BEFORE any restore.
            if state["resources"]:
                self.quiesce()
            order = {"lambda": 0, "bedrock": 1, "cloudfront": 2, "pipeline": 3, "webhook": 4}
            for resource in sorted(list(state["resources"]), key=lambda r: order[r["kind"]]):
                self.change(resource, restore=True)
                state["resources"].remove(resource)
                self.save(state)
            state["mode"] = "on"
            state.pop("errors", None)
            self.save(state)
            return {"status": "on", "consumed": state["consumed"], "baseline_usd": str(baseline)}
        state["mode"] = "off"
        state["seen"] = max(state.get("seen", 0), threshold or 0)
        self.save(state)
        errors = []
        for resource in self.resources():
            try:
                saved = next((r for r in state["resources"] if r["kind"] == resource["kind"] and r["id"] == resource["id"]), None)
                if saved is None:
                    resource["original"] = self.snapshot(resource)
                    state["resources"].append(resource)
                    self.save(state)
                    saved = resource
                self.change(saved)
            except Exception as exc:
                code = getattr(exc, "response", {}).get("Error", {}).get("Code", type(exc).__name__)
                errors.append(f"{resource['kind']}:{resource['id']}: {code}")
        try:
            self.quiesce()
        except Exception as exc:
            errors.append(str(exc))
        if errors:
            state["errors"] = errors
            self.save(state)
            raise RuntimeError(json.dumps(errors))
        # Consume all thresholds already crossed, even if multiple alerts arrive out of order.
        observed = max(self.spend(), Decimal(threshold or 0))
        state["consumed"] = sorted(set(state["consumed"]) | {t for t in THRESHOLDS if Decimal(t) <= observed})
        state.pop("errors", None)
        self.save(state)
        return {"status": "off", "consumed": state["consumed"]}


def handler(event, context):
    import boto3
    global _controller
    # Reuse SDK models/connection pools across warm invocations. Creating a new
    # Session and its service clients for every notification exhausts small runtimes.
    if _controller is None:
        config = json.loads(os.environ["CONFIG"])
        session = boto3.Session()
        if session.client("sts").get_caller_identity()["Account"] != config["account"]:
            raise RuntimeError("Wrong account")
        _controller = Controller(session, config, os.environ["STATE_BUCKET"])
    session = _controller.session
    try:
        result = _controller.run(event)
    except Exception as exc:
        session.client("sns").publish(TopicArn=os.environ["RESULTS_TOPIC"],
            Subject="Portfolio cost control FAILED", Message=f"{type(exc).__name__}: inspect controller logs and failure queue; shutdown may be partial.")
        raise
    if event.get("Records"):
        sns = event["Records"][0]["Sns"]
        # Correlate actual SNS delivery without logging notification bodies.
        print(json.dumps({"event": "budget-notification", "message_id": sns.get("MessageId"),
            "threshold": _controller.config["topics"].get(sns["TopicArn"]), "status": result.get("status")}))
    if event.get("action") != "status" and not result.get("status", "").startswith("ignored"):
        session.client("sns").publish(TopicArn=os.environ["RESULTS_TOPIC"],
            Subject="Portfolio cost control result", Message=json.dumps(result))
    return result
