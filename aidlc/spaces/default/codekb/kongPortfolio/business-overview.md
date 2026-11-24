# Business Overview

## Purpose and domain
`kongPortfolio` is a Japanese-first personal portfolio with Chinese and English presentation and a bounded Q&A feature. The SPA presents profile, projects, skills, architecture explanations, a regex lab and release-recovery illustrations. The Spring API serves locale-specific public profile records and optional AI answers. Evidence: `README.md:1-4`, `frontend/src/App.tsx:28-95`, `backend/src/main/java/dev/kongortfolio/profile/ProfileController.java:13-16`.

## Key user flows
1. Browser language or stored preference selects `ja`, `zh` or `en`; manual selection persists (`frontend/src/i18n.ts:1-23`).
2. Page requests public profile JSON; local content can reload from an explicitly configured directory (`frontend/src/App.tsx:60-76`, `ProfileService.java:21-49`).
3. Visitor opens Q&A and asks about documented experience; API enforces format/size/language, then the service uses approved facts and bounded inference when enabled (`BedrockController.java:27-77`, `QuestionService.java:40-76`).

## Delivery context and limits
Terraform source defines private S3/CloudFront, HTTP API/Lambda and AWS release stages; the repository also contains Docker Compose for local integration. These files establish intended/implemented configuration, while historical releases describe their own dates and do not establish current live status (`docs/architecture/overview.md:1-3`, `docs/deployment/README.md:1-12`). The code contains no application database. Q&A uses approved text, not a deployed vector knowledge base (`docs/architecture/overview.md:26-30`).
