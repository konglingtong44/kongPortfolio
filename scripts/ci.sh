#!/usr/bin/env bash
# AWS CI only: no deploy credentials, ECR push, production access or privileged Docker.
set -euo pipefail
cd "$(dirname "$0")/.."
component="${1:-all}"
case "$component" in all|frontend|backend) ;; *) echo 'Invalid CI component' >&2; exit 1;; esac
sha="$(git rev-parse HEAD)"
[[ "$sha" =~ ^[0-9a-f]{40}$ ]]
export CI=true
mkdir -p .local/ci-results

if ! command -v gitleaks >/dev/null 2>&1; then
  version=8.30.1
  archive="gitleaks_${version}_linux_x64.tar.gz"
  url="https://github.com/gitleaks/gitleaks/releases/download/v${version}"
  tools="$(mktemp -d "$PWD/.local/ci-tools-XXXXXXXX")"
  curl --fail --silent --show-error --location "$url/$archive" -o "$tools/$archive"
  curl --fail --silent --show-error --location "$url/gitleaks_${version}_checksums.txt" -o "$tools/checksums.txt"
  (cd "$tools" && grep "  $archive$" checksums.txt | sha256sum --check --strict -)
  tar -xzf "$tools/$archive" -C "$tools" gitleaks
  export PATH="$tools:$PATH"
fi
[[ "$(gitleaks version)" == '8.30.1' ]] || { echo 'Expected pinned Gitleaks 8.30.1' >&2; exit 1; }

node .githooks/check-staged-paths.mjs --all
gitleaks git --redact --no-banner .
gitleaks dir --redact --no-banner .
node scripts/test-hooks.mjs

# Always report a stable CodeBuild status, even for unrelated changes.
# Unknown/missing diff base runs checks rather than guessing that nothing changed.
run_checks=true
base="${CI_BASE_SHA:-${CODEBUILD_WEBHOOK_PREV_COMMIT:-}}"
if [[ "$component" != all && "$base" =~ ^[0-9a-f]{40}$ && ! "$base" =~ ^0+$ ]] && git cat-file -e "$base^{commit}" 2>/dev/null; then
  git diff --name-only "$base" "$sha" > .local/ci-changed-paths
  shared='^(codebuild/|scripts/|\.githooks/|compose\.yaml$|\.gitignore$|\.gitattributes$|\.gitleaks\.toml$|AGENTS\.md$)'
  if ! grep -Eq "$shared|^$component/" .local/ci-changed-paths; then run_checks=false; fi
fi

if [[ "$run_checks" == true ]]; then
  if [[ "$component" == all || "$component" == frontend ]]; then
    (cd frontend && npm ci && npm test && npm run build)
    node scripts/package-frontend.mjs
    mkdir -p .local/ci-results/frontend
    cp ".local/artifacts/$sha/frontend.tar.gz" ".local/artifacts/$sha/manifest.json" ".local/artifacts/$sha/SHA256SUMS" .local/ci-results/frontend/
  fi
  if [[ "$component" == all || "$component" == backend ]]; then
    mvn -B -ntp -f backend/pom.xml verify
  fi
fi
printf '{"commit":"%s","component":"%s","applicationChecksRan":%s}\n' "$sha" "$component" "$run_checks" > .local/ci-results/result.json
echo "CI passed for $component at $sha (applicationChecksRan=$run_checks). No release deployed."
