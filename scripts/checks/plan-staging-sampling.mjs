import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { bedrockContracts, presentationContracts } from '../staging-contract.mjs';

const contractUrl = new URL('../staging-contract.mjs', import.meta.url);
const pricing = JSON.parse(readFileSync(new URL('./staging-pricing.json', import.meta.url), 'utf8'));

// Preparation only: no AWS APIs, child processes, network requests or execution path.
export function samplingPlan(options = {}) {
  assert.ok(options && typeof options === 'object' && !Array.isArray(options), 'Options must be an object');
  const allowed = ['repeats', 'assumedInputTokens', 'outputTokens', 'scenarioBudgetUsd', 'spacingSeconds'];
  assert.ok(Object.keys(options).every(key => allowed.includes(key)), 'Unknown plan option');
  const { repeats = 3, assumedInputTokens = 6000, outputTokens = 1024,
    scenarioBudgetUsd = 0.10, spacingSeconds = 15 } = options;
  const samples = [...bedrockContracts, ...presentationContracts];
  assert.ok(Number.isSafeInteger(repeats) && repeats >= 1 && repeats <= 3);
  assert.ok(Number.isSafeInteger(assumedInputTokens) && assumedInputTokens > 0 && assumedInputTokens <= 100000);
  assert.ok(Number.isSafeInteger(outputTokens) && outputTokens >= 16 && outputTokens <= 1024);
  assert.ok(Number.isFinite(scenarioBudgetUsd) && scenarioBudgetUsd > 0 && scenarioBudgetUsd <= 1);
  assert.ok(Number.isSafeInteger(spacingSeconds) && spacingSeconds >= 15 && spacingSeconds <= 60);
  assert.equal(new Set(samples.map(c => c.label)).size, samples.length);
  const calls = samples.length * repeats;
  assert.ok(calls <= 30, 'Maximum planned requests exceeded');
  const estimate = calls * (assumedInputTokens * pricing.inputUsdPerMillion + outputTokens * pricing.outputUsdPerMillion) / 1e6;
  assert.ok(estimate <= scenarioBudgetUsd, 'Scenario estimate exceeds requested budget');
  const requests = [];
  for (let repetition = 1; repetition <= repeats; repetition++) {
    for (const sample of samples) {
      requests.push({ sampleId: sample.label, language: sample.language, expectedKind: sample.kind, repetition,
        earliestStartAfterSeconds: 70 + requests.length * spacingSeconds });
    }
  }
  return {
    kind: 'staging-sampling-draft', schemaVersion: 1, executable: false, approvalsGranted: false,
    target: { functionName: 'kongportfolio-stg', region: pricing.region, model: pricing.model,
      functionVersion: null, gitCommit: null, releaseId: null, factsVersion: null, factsSha256: null },
    contractsSha256: createHash('sha256').update(readFileSync(contractUrl)).digest('hex'),
    pricing, scenario: { assumedInputTokens, outputTokens, scenarioBudgetUsd, estimatedModelUsd: Number(estimate.toFixed(8)),
      hardBillingCap: false, excludes: ['tax', 'Lambda', 'S3', 'CloudWatch', 'CI/CD', 'unrecorded or prior requests'] },
    limits: { maxRequests: calls, retries: 0, concurrency: 1, initialCooldownSeconds: 70,
      minimumStartSpacingSeconds: spacingSeconds, maxRunSeconds: 1200 },
    stopOn: ['unexpected transport/service error', '429', 'missing usage', 'changed candidate/configuration',
      'observed tokens exceed scenario assumption', 'request/time limit reached'],
    requiredBeforeExecution: ['user authorization for actual sampling scope and cost', 'independent immutable STG version and candidate binding',
      'approved facts version/hash and model configuration', 'fresh pricing/configuration review', 'remaining instance allowance and no concurrent evaluation'],
    requests,
  };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    assert.ok(process.argv.length <= 3);
    const options = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], 'utf8')) : {};
    console.log(JSON.stringify(samplingPlan(options), null, 2));
  } catch {
    console.error('Sampling plan rejected: invalid options or scenario budget exceeded. No AWS request was made.');
    process.exitCode = 1;
  }
}
