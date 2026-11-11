# S1-01T — timeline and resume reconciliation

Acceptance: large Stardew-inspired 03 button; synchronized vertical timeline on the left and horizontal cards on the right; selecting a timeline entry scrolls before opening its detail; cancel pending opens on interruption; 01 ↔ 02 ↔ 03 navigation survives manual scrolling and fractional alignment; richer source-backed project detail; technology-based Bento categories.

Content: 7 professional projects, 1 personal project, 8 career/education timeline records, 12 technology categories plus a separate website-technology card. Professional periods follow the October 2026 PDF; the April XLS supplies supporting scope/tools. Contact, address, birthday and customer/internal-project identifiers excluded.

Checks: production frontend build; 28 frontend tests; 5 backend HTTP tests; live API count/content check; Gitleaks and Compose configuration passed. Desktop verification through the existing VS Code preview confirms 01 → 02, 02 first item → 01, the left timeline, scroll-then-open project details, and button layout. Also verified: large button → 03, upward wheel → 02 retaining the selected project, and subsequent horizontal wheel navigation with synchronized timeline. Mobile/touch and container images remain unverified.


Pause for review. No AWS changes. Roadmap remains local → approved first AWS deployment → AWS-native CI/CD → blue/green; no GitHub Actions. Bedrock remains a placeholder.

## S1-01L — compact toolkit layout

Acceptance: complete rows with equal-width category cards; compact title/icon headers; website technology and qualifications paired below; 3/2/1 responsive columns; retain all source-backed content and open qualifications. Implemented in isolated `frontend/src/skills.css`. Build and 28 existing frontend tests passed; desktop category grid inspected in the live VS Code preview. Footer pair and mobile layout were not visually checked because user input interrupted the window session. No backend changes. Ready for layout review.

## S1-01I — introduction milestones and explicit return

Acceptance: recompose 01 with introduction on the left and a vertical education/employment timeline on the right; supplied dates, university/faculty/major and anonymous A-China/A-Japan/B labels in ja/zh/en; add a visible wood-style 02 → 01 button; retain the rest of the site. Implemented. Build, 32 frontend tests and Gitleaks passed. Desktop preview visually confirms all four milestones fit a short desktop viewport. Return-button behavior is covered by a test; native element-click verification was unavailable due to UI geometry. Mobile visual review remains pending. No backend change.

## S1-01F — readable introduction and live preview content

Acceptance: shorten the three introductions; do not intercept 01 wheel scrolling until the introduction bottom is visible; show the current source copy in the running review API. Implemented. Japanese introduction is 243 characters. Local-only `portfolio.content-directory` enables per-request public JSON loading; packaged/default mode remains classpath-based. `scripts/dev.ps1` opts into the source directory; no secrets or source resumes are served.

Verification: frontend production build and 33 tests; Maven verify with 7 tests, including local content reload without service restart; PowerShell startup syntax parsed; the local API matched the source in all three languages. Native wide/narrow visual checks could not be completed: Computer Use stopped because it could not reliably establish the browser URL. Container build remains unverified.

Local development: run `scripts/dev.ps1`, then open http://localhost:5173 (API 8080).

## S1-02 — Docker API test button

Acceptance: replace the About dialog's pending badge with `test`; call Java, log access at INFO, then show a localized pixel-style popup; handle connection failures and prevent duplicate requests. No Bedrock/AWS calls.

Implemented `POST /api/bedrock` and the frontend dialog. Verified: 39 frontend tests and production build; Maven verify with 8 tests including HTTP response and captured INFO log; both Docker images built and containers healthy; POST through Nginx on port 3000 returned PREPARING and appeared in backend INFO logs. Native browser appearance remains unverified. No AWS resources created.

## Phase 1 ? API logging and DevOps preparation

Scope: all synchronous /api calls get INFO stdout + rotated info.log; POST /api/bedrock remains a testing placeholder. Keep local independent frontend/backend containers and dev scripts. Prepare AWS CodeBuild CI, static verification bundle and AWS architecture/cost/release documents. No AWS resources, production deployment, branch protection, commits or pushes. See docs/verification.md for actual checks and gaps.
