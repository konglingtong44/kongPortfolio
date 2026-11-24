# Technology Stack

## Runtime and build
| Area | Declared technology | Evidence |
|---|---|---|
| Browser | React 19.3.1, React DOM 19.3.1, TypeScript 7.0.2, Vite 8.3.7 | `frontend/package.json:11-28` |
| Frontend tests | Vitest 5.1.0, Testing Library 16.3.3, jsdom 31.0.0 | `frontend/package.json:18-28`; `frontend/vite.config.ts:10` |
| API | Java 21, Spring Boot 4.1.2 Web MVC and Actuator | `backend/pom.xml:5-33` |
| Lambda adapter | AWS serverless Java container for Spring Boot 4, 3.0.5 | `backend/pom.xml:47-55` |
| AWS access | AWS SDK Java 2.59.0 S3, auth, HTTP signing and credential modules | `backend/pom.xml:17-27` |
| Infrastructure | Terraform `>=1.10,<2.0` in inspected roots; AWS resources | `infra/terraform/portfolio/main.tf:1-12`; `infra/terraform/cicd/main.tf:1-16` |
| Local integration | Docker Compose, backend/frontend Dockerfiles | `compose.yaml:1-22` |

## AWS service configuration in source
`portfolio` root declares private S3, CloudFront, HTTP API, Java 21 Lambda and Route 53/ACM optional domain (inventory and `api.tf`). `cicd` root declares CodeConnections, CodeBuild, CodePipeline and Lambda CodeDeploy with two manual gates (`candidate-pipeline.tf:209-390`; `deployment.tf:48-55`). `bedrock-content` root and Java facts reader support pinned private reference text; model call uses Bedrock Mantle when enabled (`ApprovedFacts.java:49-84`; `MantleGateway.java:28-83`). Source configuration is not a fresh verification of deployed state.
