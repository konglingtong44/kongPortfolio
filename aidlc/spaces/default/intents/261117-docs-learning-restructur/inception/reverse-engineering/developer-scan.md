## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**: `backend/pom.xml`; `backend/src/main/java/` (controllers, records, services, model gateway, access filter); `backend/src/lambda/java/`; `backend/src/main/resources/application.properties`.
- **Analyzed deeply**: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/src/App.tsx`, `frontend/src/i18n.ts`, `frontend/src/profile.ts`, `frontend/src/features/qa/bedrock-api.ts`.
- **Analyzed deeply**: `infra/terraform/portfolio/api.tf`, `infra/terraform/cicd/candidate-pipeline.tf`, `infra/terraform/cicd/deployment.tf`; `scripts/check-docs.mjs`, `scripts/checks/check-docs.mjs`.
- **Analyzed deeply**: `scripts/ai/` (`codex.ps1`, `tools.ps1`, `test-codex-report.ps1`) and `docs/learning/13-aidlc-codex.md`.
- **Analyzed deeply**: `README.md`, `docs/README.md`, `docs/architecture/overview.md`, `docs/deployment/README.md`, `docs/learning/README.md`, `.gitignore` (project-owned portion).
- **Skimmed only**: remaining `frontend/src/` components, styles, tests and assets; backend resource content and tests; other Terraform roots and tests; `codebuild/`; remaining `scripts/`; remaining `docs/` groups; `.githooks/`, project-owned `.agents/skills/`, `.github/`, `AGENTS.md`, Dockerfiles and `compose.yaml`.
- **Left out**: ignored/generated `frontend/node_modules/`, `frontend/dist/`, `backend/target/`, `.local/`, `outputs/`, `coverage/`, `.terraform/`, logs and private references; Git internals; AI-DLC generated `.codex/`, `aidlc/` except this handoff/stage output, generated `.agents/skills/aidlc*` and AI-DLC blocks in root files. Exclusion follows `.gitignore` and the developer code-analysis guide.

### Packages Found
- `frontend/`: React/TypeScript Vite SPA. `App.tsx:28-95` loads profile, language, chapters and tools; `features/qa/bedrock-api.ts:31-53` owns Q&A requests.
- `backend/`: Java Spring Boot API and Lambda adapter. `PortfolioApplication.java:6-10`; `PortfolioLambdaHandler.java:15-29`.
- `infra/terraform/`: five independent roots (`bootstrap`, `portfolio`, `cicd`, `cost-control`, `bedrock-content`) as mapped in `docs/architecture/overview.md:31-40`.
- `codebuild/`, `scripts/`, `infra/cost-control/`: AWS build specifications, local/release helpers, Python cost controller. Their internals were only skimmed.

### Build System
- **Type**: npm/Vite/TypeScript (`frontend/package.json:7-21`), Maven with a `lambda` profile (`backend/pom.xml:1-81`), Terraform roots (`infra/terraform/portfolio/api.tf:31-50`), Docker Compose (`compose.yaml:1-22`).
- **Config Files**: `frontend/vite.config.ts:1-11`, `frontend/tsconfig.json`; `backend/pom.xml`, `backend/src/assembly/lambda.xml`; `codebuild/*.yml`; Terraform `.tf` files.
- **Build Dependencies**: SPA fetches backend `/api` in local Vite proxy (`frontend/vite.config.ts:5-9`); Lambda profile adds the serverless Java container (`backend/pom.xml:47-81`); CodeBuild buildspecs call repository scripts (`codebuild/candidate.yml:14-16`).

### APIs Discovered
- Spring REST: GET `/api/profile` (`ProfileController.java:13-16`); GET `/api/bedrock/questions` and POST `/api/bedrock` (`BedrockController.java:27-77`); Actuator health at `/api/health` (`application.properties:7-10`).
- AWS edge: HTTP API `ANY /api`, `ANY /api/{proxy+}`, explicit `POST /api/bedrock`, through `live` Lambda alias (`infra/terraform/portfolio/api.tf:72-110`). No application database endpoint or repository layer found.

### Frameworks & Libraries
- Frontend declared: React/React DOM 19.3.1, TypeScript 7.0.2, Vite 8.3.7, Vitest 5.1.0 (`frontend/package.json:11-28`).
- Backend declared: Java 21, Spring Boot parent 4.1.2, AWS SDK 2.59.0, serverless container 3.0.5 in Lambda profile (`backend/pom.xml:5-33,47-55`).
- Terraform requires `>= 1.10, < 2.0` in inspected roots; AWS provider constraint should be checked per root before edits.

### Test Coverage
- **Test Directories**: `frontend/src/*.test.ts(x)` and feature tests; `backend/src/test/`, `backend/src/lambda-test/`; `infra/terraform/*/tests/`, `infra/cost-control/test_*.py`, `scripts/test-*` and `scripts/checks/test-*` discovered in inventory. Approximately 112 test declarations found by static pattern search, not a test count or execution result.
- **Test Frameworks**: Vitest/Testing Library (`frontend/package.json:18-27`), Spring Boot test/JUnit (`backend/pom.xml:28`), Terraform native tests (`*.tftest.hcl`), Node tests and Python tests present by file names.
- **Coverage Config**: no coverage threshold found in inspected frontend config (`frontend/vite.config.ts:10`). Tests/builds were not run by stage instruction.

### Code Quality Indicators
- **Linting**: no frontend lint script in `frontend/package.json:7-10`; TypeScript build runs `tsc -b`; project checks live in `scripts/check.ps1` (skimmed).
- **CI/CD**: AWS CodeBuild/CodePipeline/CodeDeploy files present. Candidate stages include Source, BuildCandidate, VerifyStaging, two manual approvals, VerifyGreen, DeployProduction and PublishFrontend subject to flags (`infra/terraform/cicd/candidate-pipeline.tf:209-390`). CodeDeploy declares 10%/5 minute canary (`infra/terraform/cicd/deployment.tf:48-55`). No GitHub Actions workflow in inventory.
- **Documentation**: `docs/README.md:1-14` routes current architecture, deployment, learning, stories and history. `scripts/checks/check-docs.mjs:1-68` checks local Markdown link targets but not heading anchors or remote pages. `scripts/check-docs.mjs:1-6` preserves old CLI/import entry.

### Technical Debt Signals
- Documentation status has time semantics: `docs/architecture/overview.md:1-3` says code as of 2026-11-17 and no live AWS query; `docs/learning/README.md:1-5` references a fixed prior release. Reorganization must preserve this distinction and existing relative links.
- API/SPA content crosses multiple locations (`backend/src/main/resources/content`, `frontend/src/ui.ts`, `frontend/src/features/qa/bedrock-copy.ts`), while the learning guide is in `docs/learning/`. A new beginner guide needs explicit source-of-truth and no invented biography.
- Local single-instance Q&A limiter is not a global quota (`QuestionService.java:143-149`; `docs/architecture/overview.md:28-30`); edge throttling is best effort (`infra/terraform/portfolio/api.tf:121-139`).
- `ApprovedFacts.java:36` and Terraform contain a specific account ID/default; these are configuration assumptions to review in a clone, not credentials.

## Handoff Summary
- **Intent-relevant finding**: Documentation and script entrypoints are path coupled. The docs link checker resolves targets from repository paths (`scripts/checks/check-docs.mjs:36-47`) and scans Git-listed Markdown (`:50-68`); the root shim preserves old imports (`scripts/check-docs.mjs:1-6`). A docs/folder move must update relative links and run the checker. Five Terraform roots have separate ownership (`docs/architecture/overview.md:31-40`), so moving them solely for directory aesthetics risks state/address changes.
- **Risks / follow-up**: This is an honest partial scan despite a requested full rescan; remaining tests, helper scripts, Terraform roots and many documents were skimmed. No project tests, builds, cloud calls or live-state checks occurred. The old partial CodeKB's four deep paths and four component names were re-verified and retained in the new scope; a coverage comparison should still be run by the root conductor before publication. This does not amount to whole-repository deep coverage.
