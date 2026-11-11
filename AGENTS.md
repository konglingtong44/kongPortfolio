# kongPortfolio working agreement

- Work in this GitHub monorepo: React + TypeScript/Vite frontend, Java 21 Spring Boot backend, Docker/Compose. No database initially.
- Deliver one small Story at a time. State acceptance criteria, implement a runnable increment, verify it, then pause for review. Keep documents short.
- Japanese first; detect browser languages, support Chinese and English, persist manual selection. Do not invent personal credentials, career history or contact details.
- Roadmap order: local website → first AWS deployment → GitHub push via AWS CodeConnections/CodePipeline/CodeBuild/ECR → AWS blue/green. No GitHub Actions.
- Bedrock Q&A and interactive technical animations are later backlog items.
- Never commit AWS keys, API keys, passwords, any `.env` file or certificates. Maintain ignores and fail-closed Gitleaks hooks. Scan before publishing. Prefer IAM roles, CodeConnections and SSM Parameter Store in later AWS work.
- Creating paid AWS resources requires the user's explicit approval. Keep local work independent of AWS.
- Run meaningful frontend/backend checks. Report verification gaps honestly; do not call an untested container build verified.
- The prior conversation documents were unavailable here. This agreement is reconstructed from the user's current instructions.
