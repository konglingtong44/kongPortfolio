# Code Structure

## Organization
| Path | Classification and responsibility |
|---|---|
| `frontend/src/App.tsx`, `i18n.ts`, `profile.ts` | SPA composition, locale utility, API response model/validation |
| `frontend/src/features/qa/bedrock-api.ts` | Q&A HTTP client and response validation |
| `frontend/src/features/{profile,qa,regex}/` | Feature components and nearby tests/styles (folder inventory skimmed) |
| `backend/src/main/java/dev/kongortfolio/profile/` | Profile model, controller and file-backed service |
| `backend/src/main/java/dev/kongortfolio/bedrock/` | Q&A controller, settings, scope/examples, facts loader, model gateway and orchestration |
| `backend/src/main/java/dev/kongortfolio/logging/` | API access filter |
| `backend/src/lambda/java/` | HTTP API v2 Lambda adapter |
| `infra/terraform/{bootstrap,portfolio,cicd,cost-control,bedrock-content}/` | Separate infrastructure roots; only selected resource files deeply analyzed |
| `codebuild/`, `scripts/` | Buildspecs and CLI/release helpers; mostly skimmed |
| `docs/{architecture,deployment,operations,ai,product,learning,stories,history}/` | Current guides, bounded stories and dated records; entrypoints deeply analyzed |

## Internal import/call edges
`App.tsx` imports locale, profile model and feature components, then calls `/api/profile`. `bedrock-api.ts` calls `/api/bedrock/questions` and `/api/bedrock`. `BedrockController` calls `QuestionService`, which uses `ApprovedFacts` and `ModelGateway`; `MantleGateway` implements that gateway (`backend/src/main/java/dev/kongortfolio/bedrock/`). `ProfileController` calls `ProfileService`. No circular relationship was found in these analyzed paths.

## Path conventions relevant to reorganization
`scripts/check-docs.mjs:1-6` is a compatibility entry for `scripts/checks/check-docs.mjs`. The latter enumerates Git-visible Markdown and checks local file targets (`:50-68`). Documentation groups are linked from `docs/README.md:1-14`, and the learning sequence is indexed in `docs/learning/README.md:7-32`. Moving files requires updates to relative imports/links and preserved script entrypoints.

`scripts/ai/` holds the project-owned Codex helper and test, with a dated explanation in `docs/learning/13-aidlc-codex.md`; the generated AI-DLC harness itself is outside this code scan.
