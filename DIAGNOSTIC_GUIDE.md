# Diagnostic Tool Guide

## Overview

The Vivaldi AI Tab Sorter includes TWO diagnostic tools that work together:

1. **Functional Diagnostic** (`diagnostic-functional.html`) - Actually TESTS feature functionality
2. **Static Diagnostic** (`diagnostic.js` and `diagnostic.html`) - Validates code and files

## 🔬 Functional Diagnostic Tool (RECOMMENDED)

### What It Does
The functional diagnostic tool **actually executes each feature** with test data to detect exactly what's broken. Unlike the static tool which just checks if code exists, this tool RUNS the code and reports the exact failure.

### How to Use
1. Install the extension in `vivaldi://extensions`
2. Navigate to `chrome-extension://[YOUR-EXTENSION-ID]/diagnostic-functional.html`
   - Find your extension ID in the extensions page
   - Or right-click the extension icon → Inspect Popup → Console → type `chrome.runtime.id`
3. Click "Run All Functional Tests" or "Run Critical Tests Only"
4. Review detailed results with exact error messages
5. Export results to share when reporting issues

### What It Tests

#### Storage & Settings (3 tests)
- ✅ **Storage Write/Read Test** - Verifies chrome.storage.local works correctly
- ✅ **Settings Persistence Test** - Tests if settings (apiKey, categories, mode) save/load properly
- ✅ **Rate Limiting Tracking Test** - Verifies request counter tracking works

#### Tab Management (3 tests)
- ✅ **Tab Query Test** - Tests if extension can read current tabs (id, url, title)
- ✅ **Duplicate Detection Algorithm Test** - Executes duplicate detection with test data
- ✅ **Tab Window Query Test** - Tests multi-window tab queries

#### AI Response Parsing (2 tests)
- ✅ **JSON Response Parsing Test** - Tests 4 different AI response formats
  - Clean JSON arrays
  - Markdown-wrapped JSON (```json```)
  - JSON with text before/after
- ✅ **Malformed JSON Handling Test** - Verifies graceful handling of invalid responses

#### API Integration (2 tests)
- ✅ **API Key Storage Test** - Tests if API keys can be stored securely
- ✅ **API Connectivity Test** - Tests if Gemini API endpoint is reachable

#### Background Service Worker (1 test)
- ✅ **Message Passing Test** - Tests popup ↔ background communication

#### Tab Organization (2 tests)
- ✅ **Tab Groups API Test** - Tests if Tab Groups API is functional (for Stacks mode)
- ✅ **Window Creation Test** - Tests if Windows API works (for Windows mode)

### Understanding Functional Test Results

**✅ PASSED**: Feature executed successfully, no errors
**⚠️ WARNING**: Feature works but with limitations or unexpected behavior
**❌ FAILED**: Feature execution threw an error - **this is what you need to fix!**

### What Makes This Diagnostic "Functional"

Traditional diagnostics check "does this file exist?" or "is this function defined?"

This functional diagnostic actually:
1. **Writes test data to storage** → reads it back → verifies it matches
2. **Queries actual tabs** → checks required properties exist
3. **Runs duplicate detection algorithm** → verifies correct duplicates found
4. **Parses various JSON formats** → ensures all formats work
5. **Sends messages to background worker** → verifies communication works
6. **Tests API endpoints** → confirms connectivity

### Example: How It Detects Real Problems

**Scenario**: User reports "duplicate removal doesn't work"

**Static diagnostic** would say:
- ✅ popup.js exists
- ✅ Contains "removeDuplicates" function
- ✅ No syntax errors

**Functional diagnostic** would say:
```json
{
  "test": "Duplicate Detection Algorithm Test",
  "status": "FAILED",
  "error": "Expected 2 duplicates, found 0",
  "details": {
    "testTabs": 5,
    "uniqueTabs": 5,
    "duplicates": 0
  }
}
```

Now you know **exactly** what's broken: the algorithm isn't detecting duplicates!

## 📋 Static Diagnostic Tools

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

**Important Note:**
- If you open `diagnostic.html` directly (e.g., by double-clicking), it will run **outside** the extension context
- This means Extension APIs (chrome.runtime, chrome.tabs, chrome.storage) will not be available
- You will see failures for these API checks - **this is expected behavior**
- Algorithm tests (duplicate detection, JSON parsing, error handling) will still work correctly
- For full runtime testing, use the command-line tool: `node diagnostic.js`

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

#### ❌ "Missing APIs: runtime, tabs, storage"
- **Cause**: Diagnostic tool opened outside extension context (e.g., double-clicking the HTML file)
- **Solution**: This is expected! Use `node diagnostic.js` for comprehensive testing. The browser version is limited when not run in extension context.
- **What works**: Algorithm tests, API connectivity, performance tests
- **What doesn't work**: Extension-specific APIs (storage, tabs, windows)

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
