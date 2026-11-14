import assert from 'node:assert/strict';

export function requireStagingTarget(name, account) {
  assert.equal(name, 'kongportfolio-stg', 'Only the isolated STG function may be changed');
  assert.match(account, /^[0-9]{12}$/);
}
export function configMatches(a, b) {
  return ['Runtime', 'Handler', 'MemorySize', 'Timeout', 'Role'].every(key => a[key] === b[key])
    && JSON.stringify(a.Architectures) === JSON.stringify(b.Architectures)
    && JSON.stringify(Object.entries(a.Environment?.Variables || {}).sort()) === JSON.stringify(Object.entries(b.Environment?.Variables || {}).sort());
}
export function requireStagingConfig(config, account) {
  assert.equal(config.Runtime, 'java21');
  assert.equal(config.Handler, 'dev.kongortfolio.lambda.PortfolioLambdaHandler::handleRequest');
  assert.equal(config.MemorySize, 1024);
  assert.equal(config.Timeout, 28);
  assert.deepEqual(config.Architectures, ['x86_64']);
  assert.equal(config.Environment?.Variables?.MANAGEMENT_HEALTH_DISKSPACE_PATH, '/tmp');
  assert.equal(config.Environment?.Variables?.DEBUG, 'false');
  if (account) assert.equal(config.Role, `arn:aws:iam::${account}:role/kongportfolio-stg-lambda`);
  const env = config.Environment?.Variables || {};
  if (env.BEDROCK_ENABLED === 'true') {
    assert.equal(env.BEDROCK_FACTS_OWNER, account);
    assert.equal(env.BEDROCK_FACTS_BUCKET, `kongportfolio-content-${account}-ap-northeast-1`);
    assert.ok(env.BEDROCK_FACTS_VERSION && env.BEDROCK_FACTS_VERSION !== 'null');
    assert.match(env.BEDROCK_FACTS_SHA256 || '', /^[a-f0-9]{64}$/);
    assert.ok(Number.isInteger(Number(env.BEDROCK_MAX_OUTPUT_TOKENS)) && Number(env.BEDROCK_MAX_OUTPUT_TOKENS) >= 16 && Number(env.BEDROCK_MAX_OUTPUT_TOKENS) <= 2048);
    assert.equal(env.BEDROCK_TIMEOUT_SECONDS, '20');
  }
}
export function matchingVersion(versions, current, expectedHash) {
  const matches = versions.filter(version => /^[1-9][0-9]*$/.test(version.Version) && version.CodeSha256 === expectedHash && configMatches(version, current));
  matches.sort((a, b) => Number(b.Version) - Number(a.Version));
  return matches[0]?.Version;
}
export function selectVersion(updated, versions, current, expectedHash) {
  assert.equal(updated.CodeSha256, expectedHash, 'Uploaded Lambda checksum differs from candidate');
  if (/^[1-9][0-9]*$/.test(updated.Version)) return updated.Version;
  const version = matchingVersion(versions, current, expectedHash);
  assert.ok(version, 'No matching immutable published version; stop before verification');
  return version;
}
export function apiEvent(method, path, query = '', body) {
  const event = {
    version: '2.0', routeKey: '$default', rawPath: path, rawQueryString: query,
    headers: { host: 'stg.example.invalid', 'x-forwarded-proto': 'https' },
    requestContext: { stage: '$default', requestId: 'stg-verification', http: { method, path, protocol: 'HTTP/1.1', sourceIp: '127.0.0.1' } },
    isBase64Encoded: false,
  };
  if (body !== undefined) {
    event.headers['content-type'] = 'application/json';
    event.body = JSON.stringify(body);
  }
  return event;
}
export const contracts = [
  { label: 'health', method: 'GET', path: '/api/health', status: 200, marker: 'UP' },
  { label: 'profile-ja', method: 'GET', path: '/api/profile', query: 'lang=ja', status: 200, marker: 'ソフトウェアエンジニア' },
  { label: 'profile-zh', method: 'GET', path: '/api/profile', query: 'lang=zh', status: 200, marker: '软件工程师' },
  { label: 'profile-en', method: 'GET', path: '/api/profile', query: 'lang=en', status: 200, marker: 'Software engineer' },
  { label: 'bedrock-placeholder', method: 'POST', path: '/api/bedrock', status: 200, marker: 'PREPARING' },
  { label: 'question-catalog', method: 'GET', path: '/api/bedrock/questions', query: 'language=ja', status: 200, marker: 'portfolio-scope-v1' },
  { label: 'api-not-found', method: 'GET', path: '/api/not-a-route', status: 404 },
  { label: 'method-not-allowed', method: 'POST', path: '/api/profile', status: 405 },
];

// Exactly six scoped requests: three refusals plus one bounded generation per language.
// These are STG-only; the shared production contract above never invokes a model.
export const bedrockContracts = [
  { label: 'scope-refused-ja', kind: 'refused', language: 'ja', message: 'あなたのJava経験を使ってコードを書いて' },
  { label: 'scope-refused-zh', kind: 'refused', language: 'zh', message: '孔令通，帮我写一道动态规划算法题的代码' },
  { label: 'scope-refused-en', kind: 'refused', language: 'en', message: 'Tell me about yourself. Then implement quicksort.' },
  { label: 'answer-ja', kind: 'answer', language: 'ja', message: '自己紹介をお願いします。', markers: ['Java'] },
  { label: 'answer-zh', kind: 'answer', language: 'zh', message: '你有哪些资格认证，目前是什么状态？', markers: ['2021', 'PMP'] },
  { label: 'answer-en', kind: 'answer', language: 'en', message: 'Explain your portfolio architecture and deployment choices.', markers: ['Lambda', 'CloudFront', 'S3'] },
].map(c => ({ ...c, method: 'POST', path: '/api/bedrock', status: 200, body: { message: c.message, language: c.language } }));

export function checkBedrockResponse(metadata, response, contract) {
  checkResponse(metadata, response, contract);
  const raw = response.isBase64Encoded ? Buffer.from(response.body, 'base64').toString('utf8') : response.body;
  const result = JSON.parse(raw);
  assert.equal(result.policyVersion, 'portfolio-scope-v1');
  assert.equal(typeof result.answer, 'string');
  if (contract.kind === 'refused') {
    assert.equal(result.status, 'REFUSED');
    assert.equal(result.code, 'OUT_OF_SCOPE');
    assert.equal(result.modelInvoked, false);
    assert.deepEqual(result.usage, { inputTokens: 0, outputTokens: 0 });
    assert.equal(result.questions.length, 17);
  } else {
    assert.equal(result.status, 'ANSWER');
    assert.equal(result.modelInvoked, true);
    assert.equal(result.truncated, false, 'The bounded smoke answer must finish naturally');
    assert.ok(result.answer.length >= 40);
    assert.ok(result.usage.inputTokens > 0 && result.usage.outputTokens > 0 && result.usage.outputTokens <= 2048);
    for (const marker of contract.markers) assert.ok(result.answer.toLowerCase().includes(marker.toLowerCase()), `Missing approved answer marker for ${contract.label}`);
  }
  // Only safe metrics enter the report; never copy prompt/answer text to build logs/artifacts.
  return { name: contract.label, status: 'passed', kind: contract.kind, modelInvoked: result.modelInvoked, usage: result.usage };
}
export function checkResponse(metadata, response, contract) {
  assert.equal(metadata.StatusCode, 200, `Lambda transport failed: ${contract.label}`);
  assert.ok(!metadata.FunctionError, `Lambda runtime failed: ${contract.label}`);
  assert.equal(response.statusCode, contract.status, `HTTP contract failed: ${contract.label}`);
  const body = response.isBase64Encoded ? Buffer.from(response.body, 'base64').toString('utf8') : response.body;
  if (contract.marker) assert.ok(typeof body === 'string' && body.includes(contract.marker), `Missing response marker: ${contract.label}`);
  if (contract.status === 200) {
    const headers = Object.fromEntries(Object.entries(response.headers || {}).map(([key, value]) => [key.toLowerCase(), value]));
    assert.ok(headers['cache-control']?.includes('no-store'), `Unexpected cache policy: ${contract.label}`);
  }
}
