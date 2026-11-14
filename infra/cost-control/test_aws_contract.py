"""Optional SDK-level adapter tests. No network, credentials or AWS mutations."""
import unittest
import json
from unittest.mock import Mock, patch
from controller import Controller

try:
    import boto3
    from botocore.stub import Stubber
except ImportError:
    boto3 = None


@unittest.skipUnless(boto3, "Install boto3 to check SDK contracts")
class Contracts(unittest.TestCase):
    def setUp(self):
        self.session = boto3.Session(aws_access_key_id="test", aws_secret_access_key="test", region_name="ap-northeast-1")
        self.controller = Controller(self.session, {}, "test-state-bucket")

    def test_lambda_unreserved_restores_by_deleting_limit(self):
        client = self.controller.client("lambda")
        with Stubber(client) as stub:
            stub.add_response("get_function_concurrency", {}, {"FunctionName": "api"})
            self.assertIsNone(self.controller.snapshot({"kind": "lambda", "id": "api"}))
            stub.add_response("delete_function_concurrency", {}, {"FunctionName": "api"})
            self.controller.change({"kind": "lambda", "id": "api", "original": None}, restore=True)
            stub.assert_no_pending_responses()

    def test_lambda_reserved_limit_restored_exactly(self):
        client = self.controller.client("lambda")
        with Stubber(client) as stub:
            stub.add_response("put_function_concurrency", {"ReservedConcurrentExecutions": 5},
                              {"FunctionName": "api", "ReservedConcurrentExecutions": 5})
            self.controller.change({"kind": "lambda", "id": "api", "original": 5}, restore=True)
            stub.assert_no_pending_responses()

    def test_webhook_only_filter_groups_are_modified(self):
        from controller import BLOCK_FILTER
        client = self.controller.client("codebuild")
        with Stubber(client) as stub:
            stub.add_response("update_webhook", {}, {"projectName": "ci", "filterGroups": BLOCK_FILTER})
            self.controller.change({"kind": "webhook", "id": "ci", "original": []})
            stub.assert_no_pending_responses()

    def test_cloudfront_changes_only_enabled_with_fresh_etag(self):
        # Unrelated settings survive the update; the original Enabled=false stays false on restore.
        client = Mock()
        config = {"Enabled": True, "CallerReference": "original", "Comment": "preserve"}
        client.get_distribution_config.return_value = {"ETag": "fresh", "DistributionConfig": config}
        self.controller.clients["cloudfront"] = client
        self.controller.change({"kind": "cloudfront", "id": "distribution", "original": False}, restore=True)
        client.update_distribution.assert_called_once_with(Id="distribution", IfMatch="fresh",
            DistributionConfig={"Enabled": False, "CallerReference": "original", "Comment": "preserve"})

    def test_pipeline_existing_disabled_transition_is_not_enabled(self):
        client = self.controller.client("codepipeline")
        with Stubber(client) as stub:
            stub.add_response("disable_stage_transition", {}, {"pipelineName": "candidate", "stageName": "Build",
                "transitionType": "Inbound", "reason": "Portfolio cost stop"})
            self.controller.change({"kind": "pipeline", "id": "candidate", "original": {"Build": False}}, restore=True)
            stub.assert_no_pending_responses()

    def test_s3_missing_state_is_initializable(self):
        with Stubber(self.controller.s3) as stub:
            stub.add_client_error("get_object", service_error_code="NoSuchKey", http_status_code=404,
                expected_params={"Bucket": "test-state-bucket", "Key": "controller/state.json"})
            self.assertIsNone(self.controller.load())

    def test_cost_stop_denies_both_bedrock_endpoints(self):
        from controller import POLICY
        client = self.controller.client("iam")
        document = {"Version": "2012-10-17", "Statement": [{"Effect": "Deny",
            "Action": ["bedrock:*", "bedrock-mantle:*"], "Resource": "*"}]}
        with Stubber(client) as stub:
            stub.add_response("put_role_policy", {}, {"RoleName": "api-role", "PolicyName": POLICY,
                "PolicyDocument": json.dumps(document)})
            self.controller.change({"kind": "bedrock", "id": "api-role", "original": False})
            stub.assert_no_pending_responses()

    def test_warm_handler_reuses_session_and_controller(self):
        import controller
        session = Mock()
        session.client.return_value.get_caller_identity.return_value = {"Account": "561798268037"}
        shared = Mock()
        shared.session = session
        shared.run.return_value = {"status": "ignored-consumed"}
        with patch.object(controller, "_controller", None), patch("boto3.Session", return_value=session) as factory, patch.object(controller, "Controller", return_value=shared) as create, patch.dict("os.environ", {"CONFIG": '{"account":"561798268037"}', "STATE_BUCKET": "state"}):
            for _ in range(6):
                self.assertEqual(controller.handler({"Records": []}, None)["status"], "ignored-consumed")
            factory.assert_called_once()
            create.assert_called_once()
            self.assertEqual(shared.run.call_count, 6)


if __name__ == "__main__": unittest.main()
