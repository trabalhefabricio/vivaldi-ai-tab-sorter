#!/usr/bin/env bash
# validate.sh – quick checks for Vivaldi AI Tab Sorter

set -euo pipefail
ERRORS=0

echo "🔍  Validating Vivaldi AI Tab Sorter…"
echo

# ── Required files ───────────────────────────────────────────────────────────

echo "📁  Required files"
for f in manifest.json popup.html popup.js background.js ai_bridge.js \
         icons/icon16.png icons/icon48.png icons/icon128.png \
         README.md DOCUMENTATION.md LICENSE; do
  if [ -f "$f" ]; then
    echo "  ✓ $f"
  else
    echo "  ✗ $f  (missing)"
    ERRORS=$((ERRORS + 1))
  fi
done

echo

# ── Manifest ─────────────────────────────────────────────────────────────────

echo "📋  manifest.json"
if command -v node >/dev/null 2>&1; then
  if node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8'))" 2>/dev/null; then
    echo "  ✓ valid JSON"
  else
    echo "  ✗ invalid JSON"; ERRORS=$((ERRORS + 1))
  fi

  V=$(node -e "console.log(JSON.parse(require('fs').readFileSync('manifest.json','utf8')).manifest_version)" 2>/dev/null)
  if [ "$V" = "3" ]; then
    echo "  ✓ Manifest V3"
  else
    echo "  ✗ expected Manifest V3, got $V"; ERRORS=$((ERRORS + 1))
  fi
else
  echo "  ⚠  Node.js not found – skipping JSON validation"
fi

echo

# ── JavaScript syntax ────────────────────────────────────────────────────────

echo "🔧  JavaScript syntax"
if command -v node >/dev/null 2>&1; then
  for js in popup.js background.js ai_bridge.js; do
    if node -c "$js" 2>/dev/null; then
      echo "  ✓ $js"
    else
      echo "  ✗ $js  (syntax error)"; ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  ⚠  Node.js not found – skipping"
fi

echo

# ── Stats ────────────────────────────────────────────────────────────────────

echo "📊  Stats"
echo "  JS  lines : $(cat *.js 2>/dev/null | wc -l | tr -d ' ')"
echo "  HTML lines: $(cat *.html 2>/dev/null | wc -l | tr -d ' ')"
echo "  Docs lines: $(cat *.md 2>/dev/null | wc -l | tr -d ' ')"

# ── Unit tests ────────────────────────────────────────────────────────────────

echo "🧪  Unit tests"
if command -v node >/dev/null 2>&1 && [ -f test/parser.test.js ]; then
  if node test/parser.test.js > /dev/null 2>&1; then
    echo "  ✓ parser tests"
  else
    echo "  ✗ parser tests failed"; ERRORS=$((ERRORS + 1))
  fi
else
  echo "  ⚠  Skipped (Node.js or test file not found)"
fi

echo
if [ $ERRORS -eq 0 ]; then
  echo "✅  All checks passed."
  exit 0
else
  echo "❌  $ERRORS error(s) found."
  exit 1
fi
