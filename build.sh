#!/usr/bin/env bash
# build.sh – build an installable .zip for Vivaldi AI Tab Sorter
#
# Usage:
#   bash build.sh            # validate, test, then package
#   bash build.sh --skip-tests   # package without running tests

set -euo pipefail

SKIP_TESTS=false
for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=true ;;
    -h|--help)
      echo "Usage: bash build.sh [--skip-tests]"
      echo "  --skip-tests  Skip validation and tests, only package"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: bash build.sh [--skip-tests]"
      exit 1
      ;;
  esac
done

# ── Pre-flight checks ────────────────────────────────────────────────────────

command -v node >/dev/null 2>&1 || { echo "❌  Node.js is required but not found."; exit 1; }
command -v zip  >/dev/null 2>&1 || { echo "❌  zip is required but not found.";     exit 1; }

# ── Validate & test ──────────────────────────────────────────────────────────

if [ "$SKIP_TESTS" = false ]; then
  echo "🔍  Running validation…"
  bash validate.sh
  echo

  echo "🧪  Running tests…"
  node test/parser.test.js
  echo
fi

# ── Read version ─────────────────────────────────────────────────────────────

VERSION=$(node -pe "JSON.parse(require('fs').readFileSync('manifest.json','utf8')).version")
ZIPNAME="vivaldi-ai-tab-sorter-v${VERSION}.zip"

echo "📦  Packaging v${VERSION}…"

# ── Package ──────────────────────────────────────────────────────────────────

mkdir -p dist
rm -f "dist/${ZIPNAME}"

zip -r "dist/${ZIPNAME}" \
  manifest.json \
  popup.html \
  popup.js \
  background.js \
  ai_bridge.js \
  icons/icon16.png \
  icons/icon48.png \
  icons/icon128.png \
  LICENSE \
  README.md

echo
echo "✅  Built dist/${ZIPNAME}"
