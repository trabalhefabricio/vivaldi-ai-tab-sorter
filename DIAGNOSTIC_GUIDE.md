# Diagnostic Tool Guide

## Overview

The Vivaldi AI Tab Sorter includes a comprehensive diagnostic tool that thoroughly tests every feature of the extension. It provides detailed reports to help you troubleshoot issues and verify that everything is working correctly.

## Two Ways to Run Diagnostics

### 1. Command-Line Tool (Node.js)

The standalone diagnostic script runs independently of the browser extension.

**Requirements:**
- Node.js 14 or higher

**Usage:**
```bash
# Run full diagnostics
node diagnostic.js

# Quick check (skips network tests)
node diagnostic.js --quick

# Export results as JSON
node diagnostic.js --json > diagnostic-report.json
```

**What It Tests:**
- ✅ Node.js environment compatibility
- ✅ All required files present
- ✅ Manifest.json validation
- ✅ JavaScript syntax checking
- ✅ HTML structure validation
- ✅ Bridge script integrity
- ✅ Background service worker implementation
- ✅ All 10 core features implementation
- ✅ Gemini API connectivity
- ✅ File sizes and potential issues

### 2. Browser-Based Tool (HTML)

The HTML diagnostic tool runs in the browser and can test runtime features.

**How to Use:**
1. Open `diagnostic.html` in Vivaldi browser
2. Click "Run Full Diagnostics" or "Quick Check"
3. Review the detailed report
4. Export results if needed

**What It Tests:**
- ✅ Browser detection (Vivaldi vs Chrome)
- ✅ Extension APIs availability
- ✅ Storage API functionality
- ✅ Tabs API access
- ✅ Saved settings integrity
- ✅ Duplicate detection logic
- ✅ Tab grouping API
- ✅ Window management API
- ✅ Storage persistence
- ✅ JSON parsing (AI response formats)
- ✅ Error handling patterns
- ✅ Rate limiting tracking
- ✅ Bridge script detection
- ✅ API connectivity
- ✅ Browser performance

## Understanding the Results

### Status Indicators

- ✅ **PASS**: Feature is working correctly
- ⚠️ **WARN**: Feature works but has minor issues or limitations
- ❌ **FAIL**: Critical issue that needs to be fixed

### Common Issues and Solutions

#### ❌ "Cannot reach Gemini API"
- **Cause**: No internet connection or firewall blocking
- **Solution**: Check your internet connection and firewall settings

#### ⚠️ "Bridge script not detected"
- **Cause**: Bridge script not installed
- **Impact**: Workspace mode unavailable, but Tab Stacks and Windows modes work
- **Solution**: Follow the bridge script installation instructions in DOCUMENTATION.md

#### ❌ "Missing required files"
- **Cause**: Incomplete installation
- **Solution**: Re-download the extension or restore missing files

#### ⚠️ "Extension not yet configured"
- **Cause**: First-time setup not completed
- **Solution**: Configure API key and categories in the extension

#### ⚠️ "Many console.log statements"
- **Cause**: Debug logging enabled
- **Impact**: Minor performance impact
- **Solution**: Normal for development, can be ignored

## Report Sections

### 1. Summary
Quick overview showing:
- Number of passed checks
- Number of warnings
- Number of failed checks

### 2. Failed Checks (if any)
Critical issues that prevent the extension from working properly.

### 3. Warnings
Non-critical issues that may affect functionality or performance.

### 4. Passed Checks
All features and components that are working correctly.

### 5. Recommendations
Prioritized action items to improve extension reliability:
- 🔴 **HIGH**: Critical issues requiring immediate attention
- 🟡 **MEDIUM**: Important but not blocking
- 🟢 **LOW**: Optional improvements

### 6. Overall Status
Final assessment:
- ✅ **All checks passed**: Extension is healthy
- ⚠️ **Functional but has warnings**: Extension works with minor issues
- ❌ **Critical issues detected**: Extension may not work properly

## Feature Tests Explained

### AI Analysis
Tests if the Gemini API integration code is present and properly structured.

### Tab Categorization
Verifies the tab categorization logic and AI response parsing.

### Duplicate Removal
Tests the duplicate URL detection algorithm.

### Workspace Mode
Checks for workspace organization implementation and bridge communication.

### Tab Stacks Mode
Verifies tab groups API integration.

### Windows Mode
Tests window creation and management code.

### Settings Persistence
Verifies that settings are properly saved and loaded from Chrome storage.

### API Rate Limiting
Checks if rate limiting tracking is implemented to prevent quota exceeded errors.

### Logic Rules
Verifies that custom logic rules can be passed to the AI.

### Model Selection
Checks if multiple Gemini models are supported.

## Exporting Results

### JSON Export (Command-Line)
```bash
node diagnostic.js --json > report.json
```

The JSON format includes:
- Timestamp
- Detailed check results
- Recommendations
- Full diagnostic metadata

### JSON Export (Browser)
Click the "💾 Export Results" button after running diagnostics. This downloads a JSON file with the complete report.

## When to Run Diagnostics

### Always Run Before:
- ✅ Reporting a bug
- ✅ Asking for support
- ✅ After updating Vivaldi
- ✅ After modifying extension files

### Good Practice:
- ✅ After initial installation
- ✅ When experiencing issues
- ✅ After changing system configuration
- ✅ Periodically (monthly) for health checks

## Troubleshooting the Diagnostic Tool

### "node: command not found"
- Install Node.js from https://nodejs.org/

### "Cannot find module"
- Run the diagnostic from the extension directory
- Ensure all files are present

### HTML diagnostic won't open
- Open directly in Vivaldi: `vivaldi://extensions` → Load unpacked
- Or double-click the HTML file

## Advanced Usage

### Automated Testing
```bash
# Run diagnostics in CI/CD pipeline
node diagnostic.js --json > results.json
if [ $? -ne 0 ]; then
  echo "Diagnostics failed!"
  exit 1
fi
```

### Comparing Results
```bash
# Save baseline
node diagnostic.js --json > baseline.json

# After changes
node diagnostic.js --json > current.json

# Compare
diff baseline.json current.json
```

## Getting Help

If diagnostics show critical issues you can't resolve:

1. **Export the diagnostic report** (JSON format)
2. **Check TROUBLESHOOTING.md** for known issues
3. **Review DOCUMENTATION.md** for configuration help
4. **Open a GitHub issue** with:
   - Diagnostic report (JSON)
   - Vivaldi version
   - Operating system
   - Steps to reproduce

## Privacy Note

The diagnostic tool:
- ✅ Runs locally only
- ✅ Does not send data anywhere
- ✅ Only checks Gemini API connectivity (no data sent)
- ✅ Exported reports contain no personal information
- ✅ Safe to share diagnostic reports when seeking help

---

**Need more help?**
- 📖 [Full Documentation](DOCUMENTATION.md)
- 🔧 [Troubleshooting Guide](TROUBLESHOOTING.md)
- 📋 [Installation Guide](INSTALL.md)
