import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { reviewStaging } from './review-staging.mjs';
import { contracts, bedrockContracts, presentationContracts } from '../staging-contract.mjs';

const expected = { pipelineExecutionId: '11111111-1111-1111-1111-111111111111', gitCommit: 'a'.repeat(40),
  releaseId: 'b'.repeat(64), backendSha256: 'c'.repeat(64), functionName: 'kongportfolio-stg', functionVersion: '42' };
const modelChecks = definitions => definitions.map(c => ({ name: c.label, kind: c.kind, status: 'passed', modelInvoked: true,
  usage: { inputTokens: 100, outputTokens: 10 }, answer: 'PRIVATE_BODY' }));
const fixture = () => ({ schemaVersion: 1, kind: 'staging-verification', passed: true, ...expected,
  checks: contracts.map(c => ({ name: c.label, status: 'passed', expectedHttpStatus: c.status })),
  bedrock: { enabled: true, passed: true, policyVersion: 'portfolio-semantic-v2',
    checks: modelChecks(bedrockContracts), presentationChecks: modelChecks(presentationContracts) },
  failureReason: 'PRIVATE_BODY', lastInvocation: { usage: { inputTokens: 9999 }, answer: 'PRIVATE_BODY' } });

test('summarizes full coverage and usage without private text or double-counting lastInvocation', () => {
  const summary = reviewStaging(fixture(), expected);
  assert.equal(summary.verdict, 'complete');
  assert.deepEqual(summary.recordedUsage, { calls: 10, inputTokens: 1000, outputTokens: 100 });
  assert.equal(summary.liveStateVerified, false);
  assert.equal(summary.approvalsGranted, false);
  assert.ok(!JSON.stringify(summary).includes('PRIVATE_BODY'));
});
test('rejects every cross-run or wrong candidate/function binding', () => {
  for (const key of Object.keys(expected)) {
    assert.throws(() => reviewStaging({ ...fixture(), [key]: 'different' }, expected));
  }
  assert.throws(() => reviewStaging(fixture(), { ...expected, functionName: 'kongportfolio-prod' }));
});
test('partial, failed, disabled or old-policy evidence cannot be complete', () => {
  for (const modify of [r => r.passed = false, r => r.bedrock.enabled = false,
    r => r.bedrock.policyVersion = 'old', r => r.bedrock.checks.pop(),
    r => r.bedrock.presentationChecks[0].status = 'failed', r => r.checks.pop()]) {
    const report = fixture(); modify(report);
    assert.equal(reviewStaging(report, expected).verdict, 'failed-or-incomplete');
  }
});
test('rejects duplicate, unknown and invalid usage evidence', () => {
  for (const modify of [r => r.bedrock.checks.push(r.bedrock.checks[0]),
    r => r.checks[0].name = 'unknown', r => r.bedrock.checks[0].modelInvoked = false,
    r => r.bedrock.checks[0].usage.inputTokens = '100', r => r.bedrock.checks[0].usage.outputTokens = 0,
    r => r.bedrock.checks[0].usage.inputTokens = Infinity]) {
    const report = fixture(); modify(report);
    assert.throws(() => reviewStaging(report, expected));
  }
});
test('CLI uses nonzero exit for incomplete/malformed evidence and redacts errors', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kong-stg-review-'));
  const reportPath = join(dir, 'report.json'), expectedPath = join(dir, 'expected.json');
  const script = fileURLToPath(new URL('./review-staging.mjs', import.meta.url));
  try {
    writeFileSync(expectedPath, JSON.stringify(expected));
    const run = report => {
      writeFileSync(reportPath, typeof report === 'string' ? report : JSON.stringify(report));
      return spawnSync(process.execPath, [script, reportPath, expectedPath], { encoding: 'utf8', cwd: dir });
    };
    assert.equal(run(fixture()).status, 0);
    const incomplete = fixture(); incomplete.passed = false;
    assert.equal(run(incomplete).status, 1);
    const bad = run({ ...fixture(), gitCommit: 'PRIVATE_BODY' });
    assert.equal(bad.status, 1); assert.ok(!bad.stderr.includes('PRIVATE_BODY'));
    assert.equal(run('{ PRIVATE_BODY').status, 1);
  } finally {
    unlinkSync(reportPath); unlinkSync(expectedPath); rmdirSync(dir);
  }
});
