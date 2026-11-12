import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const path = process.argv[2];
assert.ok(path, 'Usage: node scripts/review-first-plan.mjs <ignored first.tfplan.json>');
let plan;
try { plan = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')); }
catch { throw new Error('Invalid plan JSON; contents omitted. Export the saved plan with terraform show -json.'); }
assert.equal(plan.errored, false);
const changes = plan.resource_changes.filter(change => change.mode === 'managed');
assert.equal(changes.length, 23, 'Review any expansion of the initial 23-resource scope');
for (const change of changes) assert.deepEqual(change.change.actions, ['create'], `Unexpected mutation: ${change.address}`);
const resource = address => {
  const change = changes.find(item => item.address === address);
  assert.ok(change, `Missing ${address}`);
  return change.change.after;
};
assert.equal(resource('aws_lambda_function.api').runtime, 'java21');
assert.equal(resource('aws_lambda_function.api').memory_size, 1024);
assert.equal(resource('aws_lambda_function.api').timeout, 28);
assert.equal(resource('aws_lambda_function.api').reserved_concurrent_executions, 5);
assert.equal(resource('aws_lambda_function.api').publish, true);
assert.equal(resource('aws_lambda_function.api').environment[0].variables.DEBUG, 'false');
assert.equal(resource('aws_lambda_alias.live').name, 'live');
assert.equal(resource('aws_apigatewayv2_integration.lambda').payload_format_version, '2.0');
const config = plan.configuration.root_module.resources;
const integration = config.find(item => item.address === 'aws_apigatewayv2_integration.lambda');
assert.ok(integration.expressions.integration_uri.references.includes('aws_lambda_alias.live.invoke_arn'), 'API must invoke the alias');
const logPolicy = JSON.parse(resource('aws_iam_role_policy.logs').policy ?? '{}');
// Policy JSON can remain unknown until the log ARN exists; also review api.tf.
if (logPolicy.Statement) assert.deepEqual(logPolicy.Statement[0].Action, ['logs:CreateLogStream', 'logs:PutLogEvents']);
assert.ok(!changes.some(item => /bedrock|ec2|ecs|nat_gateway|provisioned|codedeploy|codepipeline|codebuild|route53|acm/.test(item.type)), 'Out-of-scope service in plan');
for (const group of ['aws_cloudwatch_log_group.lambda', 'aws_cloudwatch_log_group.api']) assert.equal(resource(group).retention_in_days, 7);
const block = resource('aws_s3_bucket_public_access_block.site');
for (const field of ['block_public_acls', 'block_public_policy', 'ignore_public_acls', 'restrict_public_buckets']) assert.equal(block[field], true);
assert.equal(resource('aws_s3_bucket_versioning.site').versioning_configuration[0].status, 'Enabled');
assert.equal(resource('aws_s3_bucket_ownership_controls.site').rule[0].object_ownership, 'BucketOwnerEnforced');
const distribution = resource('aws_cloudfront_distribution.site');
assert.equal(distribution.default_cache_behavior[0].viewer_protocol_policy, 'redirect-to-https');
const apiBehaviors = distribution.ordered_cache_behavior.filter(item => ['/api', '/api/*'].includes(item.path_pattern));
assert.equal(apiBehaviors.length, 2);
for (const behavior of apiBehaviors) {
  assert.equal(behavior.cache_policy_id, '4135ea2d-6df8-44a3-9df3-4b5a84be39ad');
  assert.equal(behavior.origin_request_policy_id, 'b689b0a8-53d0-40ab-baf2-68738e2966ac');
  assert.ok(behavior.allowed_methods.includes('POST'));
}
for (const error of distribution.custom_error_response) {
  assert.equal(error.error_caching_min_ttl, 0);
  assert.ok(!error.response_page_path, 'API errors must not become the SPA');
}
const apiStage = resource('aws_apigatewayv2_stage.live');
assert.equal(apiStage.default_route_settings[0].throttling_rate_limit, 1);
assert.equal(apiStage.default_route_settings[0].throttling_burst_limit, 5);
const apiLog = apiStage.access_log_settings[0].format;
assert.ok(!/query|body|[Ii]p|[Aa]uthorization/.test(apiLog));
console.log('First plan review passed: 23 creates only; alias integration; bounded runtime/logs; private S3; uncached API; no paid always-on compute or deployment services.');
