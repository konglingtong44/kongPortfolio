# kongPortfolio working agreement

- Work in this GitHub monorepo: React + TypeScript/Vite frontend, Java 21 Spring Boot backend, Docker/Compose. No database initially.
- AWS target selected by the user: private S3 + CloudFront frontend, API Gateway HTTP API + Lambda Spring Boot backend. ECS/ALB is deferred practice, not the current deployment target. Terraform manages infrastructure; AWS CodeConnections/CodeBuild/CodePipeline and Lambda CodeDeploy handle CI/CD and blue/green, with both production approval gates retained.
- Deliver one small Story at a time. State acceptance criteria, implement a runnable increment, verify it, then pause for review. Keep documents short.
- Japanese first; detect browser languages, support Chinese and English, persist manual selection. Do not invent personal credentials, career history or contact details.
- Accepted UI direction: preserve desktop layout; on phones keep 01/02 near one screen with expandable intro/career content, keep 03 naturally scrollable, retain independent timeline/project gestures and tap-to-open floating architecture explanations. Details and validation: docs/mobile-layout.md. Local verification does not mean deployed or physical-iPhone verified.
- Roadmap order: local website/Lambda adaptation → first AWS deployment → AWS CodeConnections/CodePipeline/CodeBuild → AWS blue/green → bounded Bedrock Q&A. ECR is needed only if a later container increment uses it. All CI and CD run in AWS; no GitHub Actions. Production retains two AWS approval gates.
- Bedrock Q&A is authorized in the AWS roadmap after the first deployment and CI/CD/blue-green increments; use the backend execution role, with bounded input/output and request throttling. Interactive technical animations remain backlog.
- Never commit AWS keys, API keys, passwords, any `.env` file or certificates. Maintain ignores and fail-closed Gitleaks hooks. Scan before publishing. Prefer IAM roles, CodeConnections and SSM Parameter Store in later AWS work.
- Creating paid AWS resources requires the user's explicit approval. Keep local work independent of AWS.
- Run meaningful frontend/backend checks. Report verification gaps honestly; do not call an untested container build verified.
- The prior conversation documents were unavailable here. This agreement is reconstructed from the user's current instructions.
