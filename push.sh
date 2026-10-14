#!/usr/bin/env bash
set -euo pipefail
MSG="${1:-update: $(date '+%Y-%m-%d %H:%M:%S')}"
git add -A
if git diff --cached --quiet; then
  echo "ℹ️  Nothing to commit."
else
  git commit -m "$MSG"
fi
git push
echo "✅ Pushed to origin."
