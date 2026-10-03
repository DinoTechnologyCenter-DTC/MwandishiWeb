#!/usr/bin/env bash
# Mwandishi AI — frontend build.
#
# The old gh-pages deploy has been removed: the site is served from the domain
# root at https://mwandishi.dtcwonders.online/ (see vite.config.js base:'/').
# This script now only produces the deployable artefact in frontend/dist/.
#
# To finish the pipeline, add your upload step below and keep `set -euo pipefail`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend"

echo "==> building"
npm run build
touch dist/.nojekyll

echo "==> built frontend/dist"
du -sh dist
echo
echo "    entry : dist/index.html"
echo "    404   : dist/404.html   (SPA deep-link fallback)"
echo
echo "==> TODO: no upload step configured."
echo "    This script no longer pushes anywhere. Point it at your host"
echo "    (rsync/scp/Cloudflare Pages/VPS) to finish the pipeline."
