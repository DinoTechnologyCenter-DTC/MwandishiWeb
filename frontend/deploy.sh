#!/usr/bin/env bash
# MrCV manual deploy: builds frontend/ and pushes dist/ to the gh-pages branch.
# Usage: npm run deploy   (run from frontend/)
# One-time repo setup: Settings -> Pages -> Deploy from branch -> gh-pages / root.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend"

echo "==> building"
GHPAGES=1 npm run build
touch dist/.nojekyll

ORIGIN="$(git -C "$ROOT" remote get-url origin)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "==> preparing gh-pages work area"
if git clone --quiet --branch gh-pages --single-branch "$ORIGIN" "$TMP/site" 2>/dev/null; then
  echo "    (existing gh-pages branch)"
else
  git clone --quiet "$ORIGIN" "$TMP/site"
  git -C "$TMP/site" checkout --quiet --orphan gh-pages
  git -C "$TMP/site" rm -rf . >/dev/null 2>&1 || true
fi

find "$TMP/site" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -a "$ROOT/frontend/dist/." "$TMP/site/"

git -C "$TMP/site" add -A
if git -C "$TMP/site" diff --cached --quiet; then
  echo "gh-pages already up to date, nothing to deploy"
  exit 0
fi

git -C "$TMP/site" -c user.name="mrcv-deploy" -c user.email="mrcv-deploy@localhost" \
  commit --quiet -m "deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git -C "$TMP/site" push origin gh-pages
echo "==> deployed to gh-pages"
