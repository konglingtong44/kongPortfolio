# Code Quality Assessment

## Observed checks and tests
Frontend declares `tsc -b && vite build` and `vitest run` (`frontend/package.json:7-10`), with jsdom setup (`frontend/vite.config.ts:10`). Backend declares Spring Boot tests and a Lambda-specific Maven profile/test source (`backend/pom.xml:28,47-81`). Terraform native test files, Python controller tests and Node script tests were found by inventory, but not reviewed deeply. No tests or builds ran in this read-only stage; passing counts and coverage percentages are unknown.

## Static quality indicators
Core Java request boundary rejects oversized or malformed Q&A and maps explicit error codes (`BedrockController.java:33-77`); facts loader checks exact version, owner, digest and size (`ApprovedFacts.java:49-84`). Profile type guard checks nested arrays (`frontend/src/profile.ts:12-34`). API access filter avoids logging query/body/header data (`ApiAccessLogFilter.java:19-40`). These are code observations, not security test results.

## Documentation and automation
Current docs have topical entrypoints and a dated history split (`docs/README.md:1-14`). Link checker handles local inline/reference links and Git-visible Markdown, but does not check heading fragments or remote URLs (`scripts/checks/check-docs.mjs:1-68`). Buildspecs call project scripts and Terraform declares two approval actions (`codebuild/`, `infra/terraform/cicd/candidate-pipeline.tf:284-343`). `.gitignore` excludes credential files, state, plans and generated files; `.githooks/` contains Gitleaks pre-commit/pre-push checks (skimmed).

## Debt and verification gaps
- No lint script or coverage threshold in inspected frontend package/config (`frontend/package.json:7-10`; `frontend/vite.config.ts:10`). This does not prove no other linting exists.
- Historic release documents and current guides have distinct dates. `docs/architecture/overview.md:1-3` explicitly says no live AWS check in that update; avoid treating old evidence as current production status.
- Only the paths in `reverse-engineering-timestamp.md` were deeply analyzed. UI CSS/tests, backend tests/resources, remaining Terraform roots, scripts and most docs need deeper inspection before a repository-wide move. The chosen full rescan therefore produced partial verified coverage.
- Moving Terraform roots can affect state/backend and resource ownership; moving scripts can break CodeBuild and compatibility entrypoints; moving docs can break relative links (`docs/architecture/overview.md:31-40`; `scripts/checks/check-docs.mjs:36-68`).
