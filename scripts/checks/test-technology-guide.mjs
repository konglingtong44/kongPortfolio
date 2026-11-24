import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkLinks, localLinks } from './check-docs.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const guidePath = 'docs/learning/technology-guide.md';
const guide = read(guidePath);

function read(path) { return readFileSync(resolve(root, path), 'utf8'); }

test('beginner and course entrances both lead to the guide, and inventory lists new files once', () => {
  for (const page of ['docs/learning/start-here.md', 'docs/learning/README.md']) {
    assert.ok(localLinks(read(page)).some(link => link.href === 'technology-guide.md'), `${page} missing guide link`);
  }
  const inventory = read('docs/learning/file-map-inventory.md');
  for (const path of [guidePath, 'scripts/checks/test-technology-guide.mjs']) {
    assert.equal(inventory.split(/\r?\n/).filter(line => line.startsWith('| `' + path + '` |')).length, 1, `${path} inventory row`);
  }
});

test('every local evidence and learning link in the guide resolves', () => {
  assert.deepEqual(checkLinks(root, guidePath, guide), []);
  assert.ok(localLinks(guide).length >= 25, 'guide needs direct evidence and onward reading paths');
});

test('frontend and backend technology statements stay grounded in build and source files', () => {
  const frontend = JSON.parse(read('frontend/package.json'));
  const pom = read('backend/pom.xml');
  assert.ok(frontend.dependencies.react && frontend.devDependencies.typescript && frontend.devDependencies.vite && frontend.devDependencies.vitest);
  assert.match(pom, /<java.version>21<\/java.version>/);
  assert.match(pom, /spring-boot-starter-webmvc/);
  assert.match(pom, /aws-serverless-java-container-springboot4/);
  for (const name of ['React', 'TypeScript', 'Vite', 'Vitest', 'Java 21', 'Spring Boot', 'Maven', 'JSON']) {
    assert.ok(guide.includes(name), `${name} missing from guide`);
  }
  assert.match(read('frontend/src/i18n.ts'), /navigator\.languages/);
  assert.match(read('backend/src/main/java/dev/kongortfolio/profile/ProfileController.java'), /\/api\/profile/);
});

test('local and AWS delivery explanation matches the current configuration', () => {
  const compose = read('compose.yaml');
  const site = read('infra/terraform/portfolio/site.tf');
  const api = read('infra/terraform/portfolio/api.tf');
  const pipeline = read('infra/terraform/cicd/candidate-pipeline.tf');
  assert.match(compose, /build: \.\/frontend/);
  assert.match(compose, /build: \.\/backend/);
  assert.match(site, /aws_s3_bucket_public_access_block/);
  assert.match(site, /aws_cloudfront_distribution/);
  assert.match(api, /aws_apigatewayv2_api/);
  assert.match(api, /aws_lambda_function/);
  assert.equal((pipeline.match(/category = "Approval"/g) ?? []).length, 2);
  for (const rootName of ['bootstrap', 'portfolio', 'cicd', 'cost-control', 'bedrock-content']) {
    assert.ok(guide.includes(`\`${rootName}/\``), `${rootName} explanation missing`);
  }
});

test('AI explanation distinguishes runtime facts, teaching comparison and unverified live state', () => {
  const gateway = read('backend/src/main/java/dev/kongortfolio/bedrock/MantleGateway.java');
  const facts = read('backend/src/main/java/dev/kongortfolio/bedrock/ApprovedFacts.java');
  assert.match(gateway, /qwen\.qwen3-235b-a22b-2507/);
  assert.match(gateway, /bedrock-mantle/);
  assert.match(facts, /versionId/);
  assert.match(facts, /SHA-256/);
  assert.match(guide, /教学比较：帮助理解，不是项目决策历史/);
  for (const example of [
    '不用 React', '不用 TypeScript', '不用 Vite', '不用 Spring Boot',
    '不用 Maven', '不用 Docker/Compose', '外部 CI/CD 平台', '向量检索库',
  ]) assert.ok(guide.includes(example), `missing educational comparison: ${example}`);
  assert.match(guide, /没有查询实时 AWS/);
  assert.match(guide, /AI-DLC.*开发过程/);
  assert.match(guide, /没有向量数据库或已部署的 RAG 知识库/);
});
