# Error Collection Guide

## Overview

The Vivaldi AI Tab Sorter now includes comprehensive error collection and diagnostic tools to help pinpoint exactly what errors occur during runtime. This makes it much easier to debug issues and provide exact error details.

## What's New

### 1. Error Collector (error-collector.js)

A background error collection system that automatically captures:
- ✅ **Unhandled JavaScript errors**
- ✅ **Unhandled promise rejections**
- ✅ **Console errors and warnings**
- ✅ **API errors** (Gemini API calls)
- ✅ **Storage errors** (Chrome storage operations)
- ✅ **Validation errors** (Input validation failures)
- ✅ **Response parsing errors** (AI response parsing issues)

### 2. Diagnostic Tool (diagnostic-tool.html)

A comprehensive diagnostic interface that provides:
- 📊 **Real-time error statistics**
- ✓ **System checks** (Chrome APIs, Vivaldi Bridge, etc.)
- 📋 **Error log viewer** with filtering
- 💾 **Export capabilities** (JSON reports)
- 💻 **Live console output**

## How to Use

### Step 1: Open the Extension

1. Click the Vivaldi AI Tab Sorter extension icon
2. The error collector is now automatically running in the background

### Step 2: Access the Diagnostic Tool

**Method A: From Extension Popup**
- At the bottom of the extension popup, click "🔍 Open Diagnostic Tool"

**Method B: Direct URL**
1. Open Vivaldi
2. Navigate to: `chrome-extension://[EXTENSION_ID]/diagnostic-tool.html`
3. Or right-click extension icon → "Inspect" → navigate to diagnostic-tool.html

### Step 3: Run System Checks

In the Diagnostic Tool:
1. Click **"🔍 Run All Checks"**
2. Review the system status:
   - Chrome Storage API
   - Chrome Tabs API
   - Chrome Windows API
   - Chrome Tab Groups API
   - Vivaldi Bridge (if installed)
   - Error Collector status

### Step 4: Reproduce the Issue

1. Go back to the extension popup
2. Perform the action that causes the error
3. The error will be automatically captured

### Step 5: View Collected Errors

In the Diagnostic Tool:
1. Click **"🔄 Refresh Errors"** to load latest errors
2. View error details:
   - **Error Type**: What kind of error occurred
   - **Timestamp**: When it happened
   - **Details**: Full error message and stack trace
   - **Context**: API calls, storage operations, etc.

### Step 6: Export Error Report

To share errors for debugging:
1. Click **"💾 Download Report"**
2. Save the JSON file
3. Share the file or copy relevant details

## Error Types Captured

### 1. API Errors

**What**: Errors during Gemini API calls

**Captured Info**:
- API name (e.g., "Gemini generateContent API")
- Request details (model, prompt length)
- Response status and error message
- Full error stack trace

**Example**:
```json
{
  "type": "API Error",
  "details": {
    "api": "Gemini generateContent API",
    "request": {
      "model": "gemini-1.5-flash",
      "promptLength": 2500
    },
    "error": "API key not valid"
  },
  "timestamp": "2026-01-13T15:30:00.000Z"
}
```

### 2. Storage Errors

**What**: Errors during Chrome storage operations

**Captured Info**:
- Operation type (save/load)
- Storage key
- Error message

**Example**:
```json
{
  "type": "Storage Error",
  "details": {
    "operation": "save",
    "key": "settings",
    "error": "QUOTA_BYTES_PER_ITEM quota exceeded"
  }
}
```

### 3. Validation Errors

**What**: Input validation failures

**Captured Info**:
- Field name
- Provided value
- Expected format

**Example**:
```json
{
  "type": "Validation Error",
  "details": {
    "field": "categories",
    "value": "",
    "expectedFormat": "Comma-separated list"
  }
}
```

### 4. Response Parsing Errors

**What**: Errors parsing AI responses

**Captured Info**:
- Error message
- Stack trace
- First 200 characters of response

**Example**:
```json
{
  "type": "Response Parsing Error",
  "details": {
    "error": "Unexpected token in JSON",
    "responseText": "{\"result\": [incomplete..."
  }
}
```

### 5. Workspace Mode Errors

**What**: Errors during workspace organization

**Captured Info**:
- Error message
- Stack trace
- Number of categories being organized

### 6. Tab Analysis Errors

**What**: Errors during tab analysis

**Captured Info**:
- Error message
- Categories being used
- Number of tabs being analyzed

## Console Output Monitoring

The Diagnostic Tool captures all console output in real-time:

### Console Levels Captured:
- 🔴 **ERROR**: Critical errors
- 🟡 **WARN**: Warnings
- 🔵 **LOG**: Info messages (if marked with [ERROR])

### Special Markers:
- `[ERROR_COLLECTOR]`: Messages from error collector itself
- `[ERROR]`: Error messages in console.log

## Exporting Diagnostics

### Full Diagnostic Export

Click **"📥 Export Diagnostics"** to get a complete diagnostic report containing:

```json
{
  "timestamp": "2026-01-13T15:30:00.000Z",
  "userAgent": "Mozilla/5.0...",
  "platform": "Win32",
  "language": "en-US",
  "errors": [...],
  "warnings": [...],
  "systemChecks": {
    "storage": "ok",
    "tabs": "ok",
    ...
  }
}
```

### Error Report Only

Click **"💾 Download Report"** to get just the error log:

```json
{
  "sessionId": "session_1705156800000_abc123",
  "timestamp": "2026-01-13T15:30:00.000Z",
  "summary": {
    "totalErrors": 3,
    "totalWarnings": 1,
    "totalInfo": 0
  },
  "errors": [...],
  "warnings": [...],
  "systemInfo": {...}
}
```

## Clearing Errors

To clear all collected errors:
1. Click **"🗑️ Clear All Errors"**
2. Confirm the action
3. All errors are permanently removed from storage

**Note**: This doesn't affect the extension functionality, only the error log.

## Common Scenarios

### Scenario 1: API Key Issues

**Symptoms**: "Invalid API key" or "Authentication failed" errors

**How to Diagnose**:
1. Open Diagnostic Tool
2. Run System Checks → Check Chrome Storage API
3. Refresh Errors → Look for "API Error" type
4. Review error details → Check if API key is being sent correctly

**What to Look For**:
- API Error with status 401 or 403
- Error message containing "authentication" or "key"
- Request showing apiKey as '***' (masked for security)

### Scenario 2: Bridge Not Working

**Symptoms**: "Workspace mode requires bridge" error

**How to Diagnose**:
1. Run System Checks
2. Look at "Vivaldi Bridge" status
3. Should show "ok" if installed, "warning" if not

**What to Do**:
- If showing warning, follow INSTALL.md to install bridge
- If showing ok but still errors, check error log for bridge communication failures

### Scenario 3: Parsing Errors

**Symptoms**: "Failed to parse AI response" errors

**How to Diagnose**:
1. Refresh Errors
2. Look for "Response Parsing Error"
3. Check the responseText snippet
4. Look for malformed JSON

**What to Look For**:
- Incomplete JSON (e.g., `{"result": [incomplete...`)
- Unexpected characters
- Stack trace showing JSON.parse errors

### Scenario 4: Rate Limiting

**Symptoms**: "Rate limit exceeded" or "Quota exceeded"

**How to Diagnose**:
1. Check error log for API Error type
2. Look for status 429 or "quota" in message
3. Check console output for rate limit warnings

**What to Do**:
- Wait for rate limit to reset (15 RPM, 1500 RPD for free tier)
- Check usage counter in extension popup
- Reset counter if it's stuck (not recommended to abuse)

### Scenario 5: Tab Organization Failures

**Symptoms**: Tabs not organizing as expected, no error shown

**How to Diagnose**:
1. Check error log for "Workspace Mode Error" or similar
2. Check console output for organizing messages
3. Run System Checks to verify all APIs available

**What to Look For**:
- Tab Groups API showing "not available" (required for stack mode)
- Workspace organization errors with specific failure reasons
- Chrome API permission errors

## Integration with Manual Testing

The error collector complements the manual testing guide (MANUAL_TESTING.md):

### During Manual Testing:

1. **Before Testing**: 
   - Open Diagnostic Tool
   - Run System Checks
   - Clear previous errors

2. **During Each Test**:
   - Perform the test steps
   - Watch console output in Diagnostic Tool
   - Check for errors after each action

3. **After Testing**:
   - Refresh error log
   - Review any errors that occurred
   - Export diagnostics if issues found

4. **Reporting Issues**:
   - Include error report JSON
   - Include system checks results
   - Include console output screenshots

## Advanced Usage

### Programmatic Access

You can access the error collector from the console:

```javascript
// In extension popup or diagnostic tool console:

// Get all errors
window.errorCollector.getAllErrors();

// Get formatted report
window.errorCollector.getFormattedReport();

// Manually log an error
window.errorCollector.logError('Custom Error', {
  message: 'Something went wrong',
  context: 'My custom operation'
});

// Clear errors
window.errorCollector.clear();

// Download report
window.errorCollector.downloadReport();
```

### Filtering Errors

In the diagnostic tool, errors are color-coded:
- 🔴 **Red background**: Errors
- 🟡 **Yellow background**: Warnings
- 🔵 **Blue background**: Info

### Auto-Refresh

The Diagnostic Tool auto-refreshes error log every 5 seconds to show latest errors.

## Privacy and Security

### What's NOT Captured:

- ✅ API keys (masked as '***')
- ✅ Sensitive user data
- ✅ Full tab URLs (only domains)
- ✅ Personal information

### What IS Captured:

- Error messages and stack traces
- API call metadata (model, prompt length)
- Browser environment info (user agent, platform)
- Timestamps and session IDs

### Data Storage:

- Errors stored in Chrome local storage
- Limited to 100 most recent errors
- Can be cleared at any time
- Not sent to any external service

## Troubleshooting the Diagnostic Tool

### Issue: Diagnostic Tool Won't Open

**Solution**: 
- Check if extension is loaded: `vivaldi://extensions`
- Try direct URL: `chrome-extension://[EXTENSION_ID]/diagnostic-tool.html`
- Check browser console for errors (F12)

### Issue: No Errors Showing

**Solution**:
- Click "Refresh Errors" button
- Check if error-collector.js is loaded: `window.errorCollector` should not be undefined
- Perform an action in extension to generate errors

### Issue: System Checks Failing

**Solution**:
- Check Chrome API permissions in manifest.json
- Ensure extension has required permissions
- Try reloading extension: `vivaldi://extensions` → Reload

## Best Practices

1. **Start Fresh**: Clear errors before each testing session
2. **Document Everything**: Export diagnostics when issues occur
3. **Check System First**: Run system checks before reporting issues
4. **Include Context**: Note what action caused the error
5. **Monitor Console**: Watch console output during operations

## Getting Help

When reporting issues, please include:

1. **Error Report JSON**: Downloaded from Diagnostic Tool
2. **System Checks Results**: Screenshot or text
3. **Steps to Reproduce**: Exactly what you did
4. **Expected vs Actual**: What should happen vs what happened
5. **Environment**: Vivaldi version, OS, date/time

## Example Workflow

```
1. Open Extension
   ↓
2. Open Diagnostic Tool (🔍 link at bottom)
   ↓
3. Run System Checks
   - All green? Proceed
   - Any red? Fix first
   ↓
4. Clear Previous Errors
   ↓
5. Perform Extension Action
   (e.g., analyze tabs)
   ↓
6. Check Console Output
   - Any errors logged?
   ↓
7. Refresh Error Log
   - Review captured errors
   ↓
8. Export Diagnostics
   - Save for reporting
   ↓
9. Share with Developer
   - Include JSON file
   - Describe issue
```

## Summary

The Error Collection system provides:

✅ **Automatic error capture** - No manual console checking needed
✅ **Comprehensive diagnostics** - System health at a glance
✅ **Easy export** - Share exact error details
✅ **Real-time monitoring** - See errors as they happen
✅ **Historical tracking** - Review past errors
✅ **Privacy-conscious** - No sensitive data exposed

This makes debugging and issue reporting **much more precise and effective**.

---

**Last Updated**: 2026-01-13
**Version**: 1.0
**Status**: Active ✅
