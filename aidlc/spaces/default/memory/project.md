# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance.
> Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

- Work in the existing kongPortfolio monorepo and deliver one bounded Story at a time. State acceptance criteria, implement, verify, record gaps, then pause for review.
- Start from `docs/README.md`, `docs/architecture/overview.md`, and the current Story under `docs/stories/`. Record reproducible steps and results in `docs/learning/` when requested.
- Preserve the original root `AGENTS.md` agreement. Use `portfolio-story` for project checks and `portfolio-release-review` for release evidence; AI-DLC remains the lifecycle coordinator.

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->
<!-- A project that merges into another branch than team.md names says so on its own line, read before team.md's: -->
<!-- - **Integration branch**: develop -->

## Walking Skeleton

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture

- Frontend changes: `npm --prefix frontend test` and `npm --prefix frontend run build`.
- Backend changes: `mvn -B -ntp -f backend/pom.xml verify`; Lambda changes also require the Lambda profile and actual ZIP smoke check described in the project Story skill.
- Documentation changes: `node scripts/check-docs.mjs`. The full local check entry remains `scripts/check.ps1`; secret hooks fail closed.
- Record local tests, real browser/Worker checks, device simulation, physical devices, containers, AWS STG and production separately. An omitted check stays unverified.

<!-- Project-specific specialisation. -->

## Guard Policy

<!-- Project-specific. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

- Use the existing AWS CI/CD and Terraform roots. Application delivery stays on private S3/CloudFront and HTTP API/Lambda, with both production approval gates retained.
- New paid AWS resources and real paid model sampling require explicit user authorization. This workflow setup does not authorize them.
- Do not introduce GitHub Actions, replace existing state keys or bypass release evidence and approvals.

<!-- Project-specific specialisation. -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

- React/TypeScript/Vite; Java 21/Spring Boot; local Docker/Compose; no application database initially.
- Japanese-first UI with browser language detection, Chinese/English and persistent manual selection. Preserve the accepted mobile behavior in `docs/product/mobile-layout.md`.

<!-- Technology choices locked for this project. -->

## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

- NEVER commit keys, passwords, any `.env`, certificates, Terraform state or private reference material. Do not import ignored personal documents into AI-DLC knowledge stores as part of setup.
- NEVER invent career history, credentials or contact information, or claim that installation/doctor proves a complete model-driven workflow.

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: - NEVER [behavior] (affirmed [date]) -->
<!-- Example: - NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: - ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: - ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
