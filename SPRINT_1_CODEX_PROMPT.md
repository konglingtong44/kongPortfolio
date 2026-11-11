# Current Story: S1-01

As a visitor, I can understand who Kong is, what he has built and his engineering journey through a Japanese-first personal blog homepage, with Chinese and English support.

Acceptance:
- First visit uses the first supported browser language; unsupported languages fall back to Japanese.
- A manual choice is remembered; unavailable browser storage does not crash the site.
- `/api/profile?lang=ja|zh|en` returns localized content. Missing/unsupported language falls back to Japanese.
- Loading, backend failure and retry are visible; no fake successful API status.
- Mobile/desktop layouts and keyboard-accessible language selection work.
- Resume-informed introduction, strengths, one actual personal project, clearly labeled professional cases, reverse chronological timeline and dated qualifications. Preserve team attribution for the 30+ service rollout.
- One expandable development note introduces the blog. A full article list/detail feature remains the next Story.
- Do not expose the source resume, date of birth, nearest station or internal project identifiers. The source PDF is ignored by Git and never copied to frontend public assets.
- Native local launch and Docker/Compose configuration exist. No database or AWS resources.
- Build, automated behavior tests and Gitleaks pass; record any environmental limits.

Stop after this Story for review. Do not start full article publishing, deployment, CI/CD or Bedrock.
