import assert from 'node:assert/strict';

const [base, releaseId, expectedCustomHostname] = process.argv.slice(2);
assert.ok(base && releaseId, 'Usage: node scripts/smoke-first-deployment.mjs <https://...> <releaseId> [explicit-custom-hostname]');
const origin = new URL(base);
assert.ok(origin.protocol === 'https:' && (origin.hostname.endsWith('.cloudfront.net') || origin.hostname === expectedCustomHostname) && origin.pathname === '/' && !origin.username && !origin.password, 'Use the Terraform CloudFront HTTPS output or explicitly name the approved custom host');
assert.match(releaseId, /^[0-9a-f]{64}$/);
async function request(path, init = {}) {
  const response = await fetch(new URL(path, origin), { ...init, signal: AbortSignal.timeout(45_000) });
  const body = await response.text();
  if (path === '/api' || path.startsWith('/api/')) await new Promise(resolve => setTimeout(resolve, 1200));
  return { response, body };
}
const home = await request('/');
assert.equal(home.response.status, 200);
assert.ok(home.body.includes(`/releases/${releaseId}/assets/`));
const version = await request('/version.json');
assert.equal(version.response.status, 200);
assert.equal(JSON.parse(version.body).releaseId, releaseId);
for (const match of home.body.matchAll(/(?:src|href)="(\/releases\/[^" ]+)"/g)) {
  const asset = await request(match[1]);
  assert.equal(asset.response.status, 200, `Asset unavailable: ${match[1]}`);
}
const health = await request('/api/health');
assert.equal(health.response.status, 200);
assert.equal(JSON.parse(health.body).status, 'UP');
for (const [language, phrase] of [['ja', 'ソフトウェアエンジニア'], ['zh', '软件工程师'], ['en', 'Software engineer']]) {
  const profile = await request(`/api/profile?lang=${language}`);
  assert.equal(profile.response.status, 200);
  assert.ok(profile.body.includes(phrase));
  assert.ok(profile.response.headers.get('cache-control')?.includes('no-store'));
}
const post = await request('/api/bedrock', { method: 'POST' });
assert.equal(post.response.status, 200);
assert.equal(JSON.parse(post.body).status, 'PREPARING');
const missingApi = await request('/api/missing');
assert.equal(missingApi.response.status, 404);
assert.ok(!missingApi.body.toLowerCase().includes('<html'));
const missingAsset = await request(`/releases/${releaseId}/assets/missing.js`);
assert.ok([403, 404].includes(missingAsset.response.status));
assert.ok(!missingAsset.body.includes('<div id="root">'));
console.log('Live HTTPS smoke passed: version, HTML/assets, three languages, health, POST placeholder, uncached API, real API and asset errors.');
