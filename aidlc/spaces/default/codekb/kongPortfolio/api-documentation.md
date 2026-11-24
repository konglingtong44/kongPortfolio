# API Documentation

## HTTP endpoints
| Method/path | Input | Output | Boundary |
|---|---|---|---|
| `GET /api/profile` | `lang` query, default `ja`; base locale parsed from `-`/`_` | `Profile` JSON: name, role, introduction, focus, projects, timeline, skills, qualifications, note | Unsupported locale falls back to Japanese (`ProfileController.java:13-16`; `ProfileService.java:38-49`; `Profile.java:5-15`). |
| `GET /api/bedrock/questions` | `language` query, default `ja` | `{enabled, policyVersion, questions:[{id,message}]}` | Examples are UI hints, not allowlist (`BedrockController.java:27-31`; `QuestionScope.java:5-8`). |
| `POST /api/bedrock` | JSON `{message,language}`; `ja/zh/en`, ≤1000 code points; body ≤8192 bytes | Disabled/empty: `{status:PREPARING}`; enabled: `{status:ANSWER|REFUSED,answer,truncated,policyVersion,modelInvoked,usage}`; errors `{status:ERROR,code}` | Exact URI, content type, field set and response validated (`BedrockController.java:33-77`). 429 includes `Retry-After: 60`. |
| `GET /api/health` | none | Spring Actuator health | Only health exposed at `/api` (`application.properties:7-10`). |

## Frontend contract
`App.tsx:60-76` fetches profile and `profile.ts:1-34` validates the returned fields. `features/qa/bedrock-api.ts:31-53` fetches examples, supports an older 404/preparing probe, POSTs a question, maps HTTP errors and validates answer shapes. These clients assume same-origin `/api` routing.

## Edge and security posture
Terraform declares `ANY /api`, `ANY /api/{proxy+}` and explicit `POST /api/bedrock` through `live` Lambda alias (`infra/terraform/portfolio/api.tf:81-110`). The paid route has tighter API Gateway throttling (`:117-139`). No application authentication is declared for public endpoints in analyzed code; no credentials are sent from browser to model. `ApiAccessLogFilter.java:19-40` suppresses query/body/header logging and sets `Cache-Control: no-store` for API responses.
