import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { contracts, bedrockContracts, presentationContracts } from '../staging-contract.mjs';

// Local evidence consistency only. This module has no AWS client, process launcher or network access.
export function reviewStaging(report, expected) {
  assert.match(expected.pipelineExecutionId, /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
  assert.match(expected.gitCommit, /^[0-9a-f]{40}$/);
  for (const key of ['releaseId', 'backendSha256']) assert.match(expected[key], /^[0-9a-f]{64}$/);
  assert.equal(expected.functionName, 'kongportfolio-stg');
  assert.match(expected.functionVersion, /^[1-9][0-9]*$/);
  for (const key of ['pipelineExecutionId', 'gitCommit', 'releaseId', 'backendSha256', 'functionName', 'functionVersion']) {
    assert.equal(report[key], expected[key]);
  }
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.kind, 'staging-verification');
  assert.equal(typeof report.passed, 'boolean');
  assert.equal(typeof report.bedrock?.enabled, 'boolean');
  const missing = [];
  let inputTokens = 0, outputTokens = 0, recordedCalls = 0;
  const seen = new Set();
  function inspect(rows, definitions, model) {
    assert.ok(Array.isArray(rows));
    for (const row of rows) {
      const definition = definitions.find(c => c.label === row.name);
      assert.ok(definition, 'Unknown check');
      assert.ok(!seen.has(row.name), 'Duplicate check');
      seen.add(row.name);
      assert.ok(['passed', 'failed'].includes(row.status));
      if (model) {
        assert.equal(row.kind, definition.kind);
        assert.equal(row.modelInvoked, true);
        for (const key of ['inputTokens', 'outputTokens']) {
          assert.ok(Number.isSafeInteger(row.usage?.[key]) && row.usage[key] > 0);
        }
        assert.ok(row.usage.outputTokens <= 2048);
        inputTokens += row.usage.inputTokens;
        outputTokens += row.usage.outputTokens;
        recordedCalls++;
      } else assert.equal(row.expectedHttpStatus, definition.status);
    }
    for (const definition of definitions) {
      if (!rows.some(row => row.name === definition.label && row.status === 'passed')) missing.push(definition.label);
    }
  }
  inspect(report.checks, contracts, false);
  inspect(report.bedrock.checks ?? [], bedrockContracts, true);
  inspect(report.bedrock.presentationChecks ?? [], presentationContracts, true);
  assert.ok(Number.isSafeInteger(inputTokens) && Number.isSafeInteger(outputTokens));
  const complete = report.passed && report.bedrock.enabled && report.bedrock.passed === true
    && report.bedrock.policyVersion === 'portfolio-semantic-v2' && missing.length === 0;
  return {
    kind: 'local-staging-evidence-review', verdict: complete ? 'complete' : 'failed-or-incomplete',
    ...Object.fromEntries(['pipelineExecutionId', 'gitCommit', 'releaseId', 'backendSha256', 'functionName', 'functionVersion'].map(key => [key, expected[key]])),
    missingOrFailedChecks: missing,
    recordedUsage: { calls: recordedCalls, inputTokens, outputTokens },
    usageScope: 'completed check entries only; excludes unrecorded attempts and lastInvocation',
    liveStateVerified: false, approvalsGranted: false,
  };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    assert.equal(process.argv.length, 4);
    const bytes = readFileSync(process.argv[2]);
    const summary = reviewStaging(JSON.parse(bytes), JSON.parse(readFileSync(process.argv[3], 'utf8')));
    console.log(JSON.stringify({ ...summary, reportSha256: createHash('sha256').update(bytes).digest('hex') }, null, 2));
    if (summary.verdict !== 'complete') process.exitCode = 1;
  } catch {
    // Assertion errors can contain private report values; never echo the input or raw exception.
    console.error('STG review rejected: invalid evidence or context mismatch. Usage: node scripts/checks/review-staging.mjs <report.json> <expected.json>');
    process.exitCode = 1;
  }
}
