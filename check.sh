#!/usr/bin/env bash
set -euo pipefail

REPO="simpsondevin686-lgtm/Devins-Game"
API="https://api.github.com"
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"

if [[ -z "$TOKEN" ]]; then
  echo "❌ No GITHUB_TOKEN in env." >&2
  exit 1
fi

echo "── Local git status ──"
git log --oneline -3
git status --short
echo

echo "── Pushing any uncommitted work ──"
git add -A
git diff --cached --quiet || git commit -m "checkpoint"
git push -u origin main 2>&1 | tail -3 || git push -u origin HEAD 2>&1 | tail -3
echo

echo "── Checking Pages status ──"
HTTP=$(curl -sS -w '%{http_code}' -o /tmp/pages_resp.json \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "$API/repos/$REPO/pages" || true)

if [[ "$HTTP" == "200" ]]; then
  echo "✅ Pages is enabled:"
  cat /tmp/pages_resp.json
else
  echo "⚠️  Pages not enabled (HTTP $HTTP). Enabling now..."
  curl -sS -w '\nHTTP %{http_code}\n' -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "$API/repos/$REPO/pages" \
    -d '{"source":{"branch":"main","path":"/"}}'
  echo
  echo "→ Re-checking..."
  curl -sS -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "$API/repos/$REPO/pages"
fi

echo
echo "🌐 https://simpsondevin686-lgtm.github.io/Devins-Game/"
