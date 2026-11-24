# Dependencies

## Internal relationships
- Browser SPA → profile API and Q&A API over same-origin `/api` (`frontend/src/App.tsx:60-76`; `frontend/src/features/qa/bedrock-api.ts:31-53`). Vite local server proxies `/api` to `127.0.0.1:8080` (`frontend/vite.config.ts:5-9`).
- Spring `ProfileController` → `ProfileService` → bundled profile JSON or optional local public-content directory (`backend/src/main/java/dev/kongortfolio/profile/`).
- Spring `BedrockController` → `QuestionService` → `ApprovedFacts` and `ModelGateway`/`MantleGateway` (`backend/src/main/java/dev/kongortfolio/bedrock/`). The gateway depends on AWS credential resolution; no browser-side AWS credentials.
- HTTP API → Lambda `live` alias → Spring adapter (`infra/terraform/portfolio/api.tf:72-110`; `backend/src/lambda/java/dev/kongortfolio/lambda/PortfolioLambdaHandler.java:15-29`).
- Candidate pipeline → CodeBuild buildspecs → repository `scripts/` entrypoints; first/second approval actions guard Green creation and traffic shift (`infra/terraform/cicd/candidate-pipeline.tf:209-390`).

## External dependencies
Declared npm libraries/versions are in `frontend/package.json:11-28`; Maven dependencies are in `backend/pom.xml:17-33`. AWS SDK S3 reads approved facts; SigV4-signed HTTP sends model prompts (`ApprovedFacts.java:49-84`; `MantleGateway.java:50-83`). Infrastructure requires AWS services listed in `technology-stack.md`; their live state was not queried.

## Path and contract dependencies for restructuring
Document relative links are checked from each Markdown file path (`scripts/checks/check-docs.mjs:36-47`). `scripts/check-docs.mjs` re-exports the implementation to preserve prior callers (`:1-6`). Terraform root directories map to separate state ownership (`docs/architecture/overview.md:31-40`); treat root names, backend keys, import paths, buildspec script paths, Git hooks and docs links as contracts before moving files.
