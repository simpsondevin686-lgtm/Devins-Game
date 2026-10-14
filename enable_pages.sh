#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="Devins-Game"
API="https://api.github.com"
HDRS=(-H "Accept: application/vnd.github+json"
      -H "X-GitHub-Api-Version: 2022-11-28")

TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"
if [[ -z "$TOKEN" ]]; then
  echo "❌ No GITHUB_TOKEN or GH_TOKEN in your environment." >&2
  exit 1
fi
HDRS+=(-H "Authorization: Bearer $TOKEN")

ME="$(curl -sS "${HDRS[@]}" "$API/user")"
LOGIN="$(printf '%s' "$ME" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("login",""))')"
[[ -z "$LOGIN" ]] && { echo "❌ Token failed." >&2; exit 1; }
echo "✅ Authenticated as: $LOGIN"

# .nojekyll so GitHub doesn't try to process files with Jekyll
touch .nojekyll
git add .nojekyll
git diff --cached --quiet || git commit -m "chore: add .nojekyll for Pages"
git push || true

echo "→ Enabling GitHub Pages (branch: main, root) ..."
RESP="$(curl -sS -w '\n%{http_code}' -X POST "${HDRS[@]}" \
  "$API/repos/$LOGIN/$REPO_NAME/pages" \
  -d '{"source":{"branch":"main","path":"/"}}')"
CODE="$(printf '%s' "$RESP" | tail -n1)"
BODY="$(printf '%s' "$RESP" | sed '$d')"

if [[ "$CODE" == "201" || "$CODE" == "409" ]]; then
  # 201 = created, 409 = already exists (fine)
  echo "✅ Pages enabled."
else
  echo "❌ Failed (HTTP $CODE):" >&2
  printf '%s\n' "$BODY" >&2
  exit 1
fi

# Poll once so we can print the URL even if it takes a minute to go live
INFO="$(curl -sS "${HDRS[@]}" "$API/repos/$LOGIN/$REPO_NAME/pages")"
URL="$(printf '%s' "$INFO" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("html_url",""))')"

echo
echo "🌐 Live URL (may take 30-60s on first enable):"
echo "   ${URL:-https://$LOGIN.github.io/$REPO_NAME/}"
