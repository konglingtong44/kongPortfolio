import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const releaseId = 'a'.repeat(64);
const code = readFileSync(new URL('../infra/terraform/portfolio/spa.js.tftpl', import.meta.url), 'utf8').replaceAll('${release_id}', releaseId);
const context = vm.createContext({});
vm.runInContext(code, context);
const prefix = `/releases/${releaseId}`;
const cases = [
  ['GET', '/', `${prefix}/index.html`],
  ['HEAD', '/projects/one', `${prefix}/index.html`],
  ['GET', '/version.json', `${prefix}/version.json`],
  ['GET', '/favicon.svg', `${prefix}/favicon.svg`],
  ['GET', '/api', '/api'], ['GET', '/api/profile', '/api/profile'],
  ['POST', '/api/bedrock', '/api/bedrock'], ['POST', '/projects', '/projects'],
  ['GET', '/assets/missing.js', '/assets/missing.js'],
  ['GET', '/images/missing', '/images/missing'],
  ['GET', '/missing.css', '/missing.css'],
  ['GET', '/releases/old/assets/site.js', '/releases/old/assets/site.js'],
];
for (const [method, uri, expected] of cases) {
  const querystring = { lang: { value: 'zh' } };
  const result = context.handler({ request: { method, uri, querystring } });
  assert.equal(result.uri, expected, `${method} ${uri}`);
  assert.equal(result.querystring, querystring, 'Query strings must survive routing');
}
console.log(`CloudFront routing: ${cases.length} route/method cases passed.`);
