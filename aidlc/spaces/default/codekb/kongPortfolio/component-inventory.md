# Component Inventory

## Frontend SPA
Owns browser page composition, chapter navigation and profile loading. `frontend/src/App.tsx:28-95` depends on locale, profile validation, UI features and same-origin API. Feature implementation was only partly scanned.

## Locale and profile client
`frontend/src/i18n.ts:1-23` resolves Japanese/Chinese/English from stored choice or browser languages and persists manual choice. `frontend/src/profile.ts:1-34` defines and validates public profile shape. Both are consumed by the SPA.

## Q&A client
`frontend/src/features/qa/bedrock-api.ts:3-53` fetches catalog, submits question, validates response and maps network/service failures. It depends on `/api/bedrock` HTTP contract and the locale type.

## Profile API
`backend/src/main/java/dev/kongortfolio/profile/ProfileController.java:7-17` exposes GET `/api/profile`; `ProfileService.java:15-49` reads bundled locale files or an explicit local content directory; `Profile.java:5-15` is the response record. No database dependency.

## Q&A API and policy service
`BedrockController.java:15-77` validates paid entry and maps response/errors. `QuestionService.java:40-76,143-149` coordinates approved facts, one model request, structured result validation and per-instance limits. `BedrockSettings.java:6-18` bounds settings; `QuestionScope.java:5-8` provides example questions and policy version. Controller depends on service/settings; service depends on facts and gateway.

## Approved facts and model gateway
`ApprovedFacts.java:23-106` reads bundled public facts locally or pinned S3 object with owner/version/digest checks and instance cache. `ModelGateway.java` is the interface; `MantleGateway.java:28-83` signs bounded HTTP calls to Bedrock Mantle. Q&A service depends on these components.

## Lambda and API edge
`backend/src/lambda/java/dev/kongortfolio/lambda/PortfolioLambdaHandler.java:15-29` adapts HTTP API v2 to Spring. `infra/terraform/portfolio/api.tf:31-139` declares Lambda, live alias, HTTP API integration/routes, throttling and access logs. The stage did not check live AWS resources.

## Delivery infrastructure
`infra/terraform/cicd/candidate-pipeline.tf:209-390` declares candidate/review/deploy stages and two approval actions; `deployment.tf:16-55` declares CodeDeploy canary group. `codebuild/` and most scripts were skimmed. Terraform root separation is documented in `docs/architecture/overview.md:31-40`.

## Documentation and link checker
`docs/README.md:1-14` routes topical docs; `docs/learning/README.md:7-32` indexes the learning route; `docs/deployment/README.md:1-39` gives current release entry. `scripts/checks/check-docs.mjs:1-68` verifies local Markdown targets; `scripts/check-docs.mjs:1-6` preserves existing command/import paths.

## Codex入口
`scripts/ai/codex.ps1:1-140` implements Preview/Configure/Doctor/Launch/Version/Report for the local harness and keeps diagnostics under ignored `.local/`. `scripts/ai/test-codex-report.ps1:1-55` tests report success and failure branches.

## Codex解析器
`scripts/ai/tools.ps1:1-32` looks for Codex on PATH, then in the official VS Code extension by manifest publisher/name and existing platform binary. It is called by the project Codex entry.

## 本地忽略边界
The project-owned `.gitignore` rules exclude `.local/`, credentials, private references, Terraform state/plans, build output and generated files. The helper stores diagnostic reports under `.local/aidlc` (`scripts/ai/codex.ps1:15-21`).

## 学习记录
`docs/learning/13-aidlc-codex.md:1-97` records dated setup, failures and verification gaps, with navigation through `docs/learning/README.md`. It expressly separates harness setup from a complete model-driven workflow.
