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
export function apiEvent(method, path, query = '') {
  return {
    version: '2.0', routeKey: '$default', rawPath: path, rawQueryString: query,
    headers: { host: 'stg.example.invalid', 'x-forwarded-proto': 'https' },
    requestContext: { stage: '$default', requestId: 'stg-verification', http: { method, path, protocol: 'HTTP/1.1', sourceIp: '127.0.0.1' } },
    isBase64Encoded: false,
  };
}
export const contracts = [
  { label: 'health', method: 'GET', path: '/api/health', status: 200, marker: 'UP' },
  { label: 'profile-ja', method: 'GET', path: '/api/profile', query: 'lang=ja', status: 200, marker: 'ソフトウェアエンジニア' },
  { label: 'profile-zh', method: 'GET', path: '/api/profile', query: 'lang=zh', status: 200, marker: '软件工程师' },
  { label: 'profile-en', method: 'GET', path: '/api/profile', query: 'lang=en', status: 200, marker: 'Software engineer' },
  { label: 'bedrock-placeholder', method: 'POST', path: '/api/bedrock', status: 200, marker: 'PREPARING' },
  { label: 'api-not-found', method: 'GET', path: '/api/not-a-route', status: 404 },
  { label: 'method-not-allowed', method: 'POST', path: '/api/profile', status: 405 },
];
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
