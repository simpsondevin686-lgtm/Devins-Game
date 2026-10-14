#!/usr/bin/env bash
set -euo pipefail

REPO="simpsondevin686-lgtm/Devins-Game"
API="https://api.github.com"
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"

echo "── 1. What's on origin/main (remote) ──"
git fetch origin main >/dev/null 2>&1 || true
git ls-tree -r --name-only origin/main

echo
echo "── 2. Pages config ──"
curl -sS -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "$API/repos/$REPO/pages" | python3 -m json.tool

echo
echo "── 3. Latest Pages build ──"
curl -sS -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "$API/repos/$REPO/pages/builds/latest" | python3 -m json.tool
