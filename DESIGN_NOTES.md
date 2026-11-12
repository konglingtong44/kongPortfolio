# Design notes — S1-01H

Current scene: [original discovery garden provenance and prompt](docs/original-scene.md). It supersedes the historical farm reference below; the farm file is no longer publicly served.

References: [Stardew Valley official media](https://www.stardewvalley.net/media/) and the earlier [Taste Skill](https://github.com/leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md). The user's latest direction replaces the diagonal shelf with a full-screen horizontal career/project chapter and requests one-item wheel steps. Supplied interaction and pixel-art direction override the skill's no-carousel, no-wheel-control, automatic palette and photography recipes. Its browser checker was not run.

01 keeps its content and layout. 02 combines matching timeline/project periods without repeating their cards; unmatched career entries remain. 03 expands existing evidence into six Bento categories. No new credentials, metrics, personal projects or mastery ratings were invented. Qualification dates indicate acquisition only.

Motion: scoped wheel handling on 01 and fully aligned 02, 24px gesture threshold, 480ms settling window, 170ms quiet interval; shared state prevents intro momentum skipping the first entry. Horizontal scrolling uses browser-native smooth scroll and CSS snap. Touch/coarse input, browser zoom and open dialogs are not intercepted. Reduced motion uses instant transitions. Real-device smoothness remains unverified.

Visuals: blue sky, layered mountains, orange-red roof, spring-green grass, chickens and crops; honey-colored wood outlines, warm parchment panels. Original generated illustration rather than a game screenshot. Small code-native pixel marks remain for category illustrations. System body fonts retain Japanese/Chinese readability.

Asset: `frontend/public/images/valley-farm.png` (1536×1024, approximately 2 MB), generated using the built-in image_gen tool, visually inspected and copied into the repository. The same local asset is reused; no remote font/image runtime requests. Browser appearance and slow-network behavior were not checked.

Final generation prompt:

> Create one original landscape pixel-art illustration for a personal portfolio website, inspired closely by the recognizable cozy 16-bit rural art direction of Stardew Valley. This is a scene asset, not a website screenshot. Wide landscape ratio about 3:2. Crisp visible square pixel clusters, carefully hand-crafted SNES pixel art, absolutely no smooth vector shapes, no blur, no gradients rendered smoothly, no 3D. Clear blue sky with chunky cream clouds, distant layered blue/purple mountain silhouettes, bright spring green pine and deciduous trees, a charming small timber farmhouse with warm orange-red tiled roof on right side, honey-colored wooden fences, a winding ochre dirt path, a little vegetable patch, tiny white chickens, wildflowers, a wooden mailbox. Calm balanced composition, a few meaningful details, ample open sky in upper third, sunlit and cheerful. Restrained coherent game palette with golden brown outlines and multi-tone pixel shading. Warm parchment and reddish wood details echo Stardew Valley inventory menus. Do not include text, logos, UI panels, watermark, letters or identifiable game characters. Make this immediately read as a polished Stardew Valley-inspired farm landscape rather than generic beige pixel art. Output a single complete scene with no border.

## S1-01T — resume evidence and navigation

Sources inspected read-only: October 18, 2026 PDF (all six pages; page 2 also rendered and visually inspected) and April 2026 XLS, one skills/career sheet. Raw extraction and rendering are confined to ignored `.local/resume-review/`. No source workbook/PDF was copied into public assets.

Public evidence mapping:

| Professional period | PDF | XLS supporting rows |
| --- | --- | --- |
| 2026.08–present, securities VB6 → Java Web | p.2 | No separate newer entry; do not infer an unlisted database/cloud stack |
| 2025.07–2026.07, call-center PMO/development | p.3 | 62; technical validation detail in 65 is folded into the PDF's validation scope, without a separate XLS date |
| 2025.01–2025.06, Salesforce-related tool update | p.4 | 68; retain full PDF period |
| 2023.06–2024.12, insurance/internal systems & AWS | p.4 | 71, 74; two subprojects under one PDF period |
| 2019.05–2023.05, telecom development/platform renewal | p.5 | 77, 80, 83; retain the PDF's consolidated period |
| 2018.12–2019.04, telecom lookup | p.6 | 86; PDF date overrides the older XLS date |
| 2018.06–2018.12, Oracle → Hadoop tasks | p.6 | 89 |

Education and qualifications follow PDF p.1. Technology categories follow PDF p.2 and XLS rows 13–29, with only populated experience/knowledge cells used as supporting evidence. Do not infer skills from blank template labels. No invented proficiency scores. RDS inspection and configuration, legacy-code analysis, Selenium PoC and Bedrock/Lex research are explicitly scoped. The site's own technology is a separate card, rather than being passed off as resume evidence.

Navigation uses document-level wheel routing by visible chapter coverage instead of a ±5px top-position gate. Upward movement in the top of 03 returns to 02; scrolling within the rest of the long toolkit stays native. Horizontal position is re-read after manual vertical navigation. Timeline motion follows fractional horizontal position; timeline buttons scroll first, then open on scroll completion/proximity. Pointer interruption/new selection cancels the pending modal. Keyboard access includes timeline Up/Down/Home/End and card Left/Right/Home/End.

## S1-01U — interactive architecture explorer

Acceptance: remove the obsolete site-technology card; replace kongPortfolio's farm thumbnail with a diagram entry; open a large, trilingual dialog with connected runtime and delivery maps, node explanations, and a browser-only canary/rollback demo. Preserve the parchment/wood palette, keyboard access, Escape/focus restoration and reduced motion. Other project details keep their existing behavior. The SYSTEM module reuses the new explorer.

Runtime distinguishes deployed services, planned Bedrock and the undeployed ALB/ECS/Docker/ECR alternative. Delivery documents manual SHA selection, both approvals, immutable candidates, Lambda canary and subsequent versioned frontend publication. Hover/focus explanations accompany persistent tap-selected descriptions; narrow screens scroll the diagram independently. The demo has no network calls and explicitly distinguishes verified stop-triggered rollback from undrilled alarm/application-failure paths.

Cost comparison is backend plus ingress only: Tokyo on-demand prices checked 2026-11-13 against AWS regional Price Lists. Lambda uses 10,000 requests/month, 1 GB and one billed second per request; HTTP API is $1.29/million. ECS uses one 0.5-vCPU/1-GB task for 730 hours, one ALB, 0–1 LCU and three public IPv4 addresses, without NAT or task-level AZ redundancy. Shared services, transfer, logs, CI/CD, ECR, Bedrock, domain and taxes are excluded; estimates are not bills or caps. Official sources are linked in the UI.

Browser QA: local Chrome entry/dialog, hover narration, both diagrams, 10% traffic and stop-triggered rollback observed; 200% zoom checked for readable wrapping and independent map scrolling. Physical touch devices and other browsers remain unverified. No production deployment or AWS resource changes in this increment.

Verification passed: frontend build and 44 tests, static artifact packaging, 9 backend HTTP tests, 3 Lambda adapter tests and packaged-ZIP smoke, Gitleaks working-tree scan, private-path checks and fail-closed hook checks. Container images were not built or tested.

Follow-up: tabs are Architecture, CI/CD and Failure recovery. Removed the disconnected decorative foundation marks. Vite is explicitly a development/build tool on the S3 artifact node, rather than a running browser service. Failure recovery has three local simulations (frontend publication failure, operator-confirmed application failure, and a deployment-time CloudWatch alarm), with play/pause, direct step selection and reset. Preserve the distinction between HTTP errors and Lambda Errors, frontend-only recovery and backend version rollback, and configuration versus actual drill coverage. Timer cleanup, pause, scenario changes and both recovery pointers are covered by the frontend tests.

Latest follow-up supersedes the three-scenario navigation above: eight release-position cases now separate build/STG, approval ①, Green/approval ②, canary application errors, canary alarms, frontend publication, later frontend incidents and post-promotion API incidents. Each has explicit service/script automation, operator console steps and verification responsibilities. Pre-traffic cases retain Blue 100% with no rollback command; post-completion API recovery is a new approved release of known-good source. General session/cache/API/schema/idempotency risks are labeled as general guidance; no sessions, Redis or DB were added. Original discovery-garden artwork replaces the farm throughout the public site; provenance/prompt are linked above. Local Chrome confirmed the stage/actor layout and replacement background. Frontend build, 50 tests, frontend recovery/routing checks and secret scan passed; no live AWS drills or deployment were performed.
