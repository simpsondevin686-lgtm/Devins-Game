#!/usr/bin/env bash
set -euo pipefail

REPO="simpsondevin686-lgtm/Devins-Game"
API="https://api.github.com"
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"

for i in 1 2 3 4 5 6; do
  INFO=$(curl -sS -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "$API/repos/$REPO/pages/builds/latest")

  STATUS=$(printf '%s' "$INFO" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("status",""))')
  MSG=$(printf '%s' "$INFO" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("error",{}).get("message") or "")')

  echo "[$i] status=$STATUS  err=$MSG"

  if [[ "$STATUS" == "built" ]]; then
    echo "✅ Build succeeded."
    break
  fi
  if [[ "$STATUS" == "errored" ]]; then
    echo "❌ Build failed."
    printf '%s' "$INFO" | python3 -m json.tool
    break
  fi

  sleep 15
done

echo
echo "🌐 https://simpsondevin686-lgtm.github.io/Devins-Game/"
