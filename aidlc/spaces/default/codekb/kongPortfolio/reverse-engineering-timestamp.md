# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-19
- Commit: fc455d3ac58eb8aa7cad13a01afe6fdbe50cd7cc
- Method: Read-only source and document scan; no project tests/builds or AWS calls. The chosen full rescan reached partial verified depth, as listed below.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: docs-learning-restructur
fingerprint: aaaf1c7b2f77efb3ca54617517d5a9f4e53cc1b5
analyzed:
  paths:
    - backend/pom.xml
    - backend/src/main/java/
    - backend/src/lambda/java/
    - backend/src/main/resources/application.properties
    - frontend/package.json
    - frontend/vite.config.ts
    - frontend/src/App.tsx
    - frontend/src/i18n.ts
    - frontend/src/profile.ts
    - frontend/src/features/qa/bedrock-api.ts
    - infra/terraform/portfolio/api.tf
    - infra/terraform/cicd/candidate-pipeline.tf
    - infra/terraform/cicd/deployment.tf
    - scripts/check-docs.mjs
    - scripts/checks/check-docs.mjs
    - scripts/ai/
    - docs/README.md
    - docs/architecture/overview.md
    - docs/deployment/README.md
    - docs/learning/README.md
    - docs/learning/13-aidlc-codex.md
    - README.md
    - .gitignore
  components:
    - Frontend SPA
    - Locale and profile client
    - Q&A client
    - Profile API
    - Q&A API and policy service
    - Approved facts and model gateway
    - Lambda and API edge
    - Delivery infrastructure
    - Documentation and link checker
    - Codex入口
    - Codex解析器
    - 本地忽略边界
    - 学习记录
shallow:
  paths:
    - frontend/src/
    - backend/src/main/resources/content/
    - backend/src/test/
    - backend/src/lambda-test/
    - infra/terraform/
    - infra/cost-control/
    - codebuild/
    - scripts/
    - docs/
    - .githooks/
    - .agents/skills/portfolio-story/
    - .agents/skills/portfolio-release-review/
    - .github/
    - AGENTS.md
    - compose.yaml
    - backend/Dockerfile
    - frontend/Dockerfile
```
