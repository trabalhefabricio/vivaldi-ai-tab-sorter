#!/usr/bin/env bash
# Validation script for Vivaldi AI Tab Sorter extension

echo "🔍 Validating Vivaldi AI Tab Sorter Extension..."
echo ""

ERRORS=0

# Check if all required files exist
echo "📁 Checking required files..."
REQUIRED_FILES=(
  "manifest.json"
  "popup.html"
  "popup.js"
  "background.js"
  "ai_bridge.js"
  "icons/icon16.png"
  "icons/icon48.png"
  "icons/icon128.png"
  "README.md"
  "DOCUMENTATION.md"
  "INSTALL.md"
  "MANUAL_TESTING.md"
  "QUICK_TEST.md"
  "TESTING_NOTES.md"
  "TESTING_DOCUMENTATION_SUMMARY.md"
  "LICENSE"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file exists"
  else
    echo "  ✗ $file is missing"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "📋 Validating manifest.json..."

# Check if Node.js is available for JSON validation
if command -v node >/dev/null 2>&1; then
  # Check if manifest.json is valid JSON
  if node -e "JSON.parse(require('fs').readFileSync('manifest.json', 'utf8'))" 2>/dev/null; then
    echo "  ✓ manifest.json is valid JSON"
  else
    echo "  ✗ manifest.json is not valid JSON"
    ERRORS=$((ERRORS + 1))
  fi

  # Check manifest version
  MANIFEST_VERSION=$(node -e "console.log(JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')).manifest_version)" 2>/dev/null)
  if [ "$MANIFEST_VERSION" = "3" ]; then
    echo "  ✓ Using Manifest V3"
  else
    echo "  ✗ Not using Manifest V3"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  ⚠ Node.js not found - skipping JSON validation"
  echo "  ℹ Install Node.js for complete validation"
fi

echo ""
echo "🔧 Checking JavaScript syntax..."

# Check JavaScript files for basic syntax errors
if command -v node >/dev/null 2>&1; then
  for jsfile in popup.js background.js ai_bridge.js; do
    if node -c "$jsfile" 2>/dev/null; then
      echo "  ✓ $jsfile syntax is valid"
    else
      echo "  ✗ $jsfile has syntax errors"
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "  ⚠ Node.js not found - skipping JavaScript syntax check"
fi

echo ""
echo "📊 File Statistics:"
echo "  Total JavaScript lines: $(cat *.js | wc -l)"
echo "  Total HTML lines: $(cat *.html | wc -l)"
echo "  Documentation lines: $(cat *.md | wc -l)"

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ All validation checks passed!"
  echo ""
  echo "🚀 Extension is ready to install:"
  echo "   1. Open vivaldi://extensions"
  echo "   2. Enable Developer mode"
  echo "   3. Click 'Load unpacked'"
  echo "   4. Select this directory"
  exit 0
else
  echo "❌ Validation failed with $ERRORS error(s)"
  exit 1
fi
