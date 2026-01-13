# Manual Testing Guide - Vivaldi AI Tab Sorter

## Overview

This guide provides comprehensive step-by-step instructions for manually testing all functions of the Vivaldi AI Tab Sorter extension. While I cannot personally download and test Vivaldi in this environment, this guide enables anyone to perform thorough manual testing.

## Prerequisites

### Required Software
- **Vivaldi Browser** (Latest stable version)
  - Download from: https://vivaldi.com/download/
  - Recommended: Version 6.0 or higher
- **Google Gemini API Key**
  - Get from: https://aistudio.google.com/app/apikey
  - Free tier is sufficient for testing

### Test Environment Setup

1. **Install the Extension**
   ```
   1. Open vivaldi://extensions
   2. Enable "Developer mode" (toggle in top-right)
   3. Click "Load unpacked"
   4. Select the extension directory
   5. Verify extension icon appears in toolbar
   ```

2. **Verify Installation**
   ```bash
   cd /path/to/extension
   ./validate.sh
   ```
   Expected output: All checks pass ✅

3. **Prepare Test Data**
   - Open `test-tabs.html` in Vivaldi
   - Keep it available for generating test tabs

---

## Test Suite

### Test 1: Extension Installation and UI

**Objective**: Verify extension loads correctly and UI is accessible

**Steps**:
1. Click the extension icon in toolbar
2. Verify popup window opens
3. Check all UI elements are visible:
   - API Key input field
   - Categories input field
   - Logic Rules textarea
   - "Remove duplicate tabs" checkbox
   - Organization mode selector (Workspaces/Tab Stacks/Separate Windows)
   - "🔍 Analyze & Preview" button
   - Status message area

**Expected Result**:
- ✅ Popup opens without errors
- ✅ All UI elements render correctly
- ✅ Gradient background displays properly
- ✅ No console errors in DevTools

**Validation**:
- Right-click extension icon → "Inspect popup"
- Check Console tab for errors
- Verify no red error messages

---

### Test 2: Settings Persistence

**Objective**: Verify settings are saved and loaded correctly

**Steps**:
1. Open extension popup
2. Enter API key: `test-api-key-12345`
3. Enter categories: `Work, Shopping, Social`
4. Enter logic rules: `GitHub goes to Work`
5. Check "Remove duplicate tabs"
6. Select "Tab Stacks" mode
7. Close popup
8. Reopen popup

**Expected Result**:
- ✅ API key field shows masked value (••••••••)
- ✅ Categories: "Work, Shopping, Social"
- ✅ Logic rules: "GitHub goes to Work"
- ✅ "Remove duplicate tabs" is checked
- ✅ "Tab Stacks" is selected

**Validation**:
```javascript
// In popup console:
chrome.storage.local.get(['apiKey', 'categories', 'logicRules', 'removeDuplicates', 'mode'], 
  (data) => console.log(data));
```

---

### Test 3: API Key Validation

**Objective**: Verify API key validation and error handling

**Test 3a: Empty API Key**
1. Open extension popup
2. Clear API key field
3. Enter categories: `Work, Personal`
4. Click "🔍 Analyze & Preview"

**Expected Result**:
- ❌ Error message: "Please enter your Gemini API key"
- ✅ No API call made

**Test 3b: Invalid API Key**
1. Enter API key: `invalid-key-12345`
2. Enter categories: `Work, Personal`
3. Open test tabs (5 tabs)
4. Click "🔍 Analyze & Preview"

**Expected Result**:
- ❌ Error message about invalid API key or authentication failure
- ✅ User-friendly error message displayed

**Test 3c: Valid API Key**
1. Enter valid Gemini API key
2. Enter categories: `Work, Personal`
3. Click "🔍 Analyze & Preview"

**Expected Result**:
- ✅ "Analyzing tabs..." status appears
- ✅ API call succeeds
- ✅ Preview results display

---

### Test 4: Category Management

**Objective**: Verify category input and validation

**Test 4a: Empty Categories**
1. Enter valid API key
2. Clear categories field
3. Click "🔍 Analyze & Preview"

**Expected Result**:
- ❌ Error: "Please enter at least one category"

**Test 4b: Single Category**
1. Enter categories: `Work`
2. Open 5 test tabs
3. Click "🔍 Analyze & Preview"

**Expected Result**:
- ✅ Analysis completes
- ✅ All tabs categorized as "Work"

**Test 4c: Multiple Categories**
1. Enter categories: `Work, Shopping, Social, Research, Entertainment`
2. Open test tabs (use test-tabs.html → "Open All Test Tabs")
3. Click "🔍 Analyze & Preview"

**Expected Result**:
- ✅ Analysis completes
- ✅ Tabs distributed across multiple categories
- ✅ Preview shows counts for each category

**Test 4d: Categories with Special Characters**
1. Enter categories: `Work & Projects, Shopping (Online), Personal-Life`
2. Open 5 test tabs
3. Click "🔍 Analyze & Preview"

**Expected Result**:
- ✅ Categories parsed correctly
- ✅ Special characters handled properly

---

### Test 5: Logic Rules

**Objective**: Verify custom logic rules are applied correctly

**Test 5a: Domain-Based Rule**
1. Enter categories: `Work, Personal, Entertainment`
2. Enter logic rules: `Always put GitHub in Work`
3. Open tabs:
   - https://github.com
   - https://youtube.com
   - https://facebook.com
4. Click "🔍 Analyze & Preview"

**Expected Result**:
- ✅ GitHub tab categorized as "Work"
- ✅ Other tabs categorized appropriately

**Test 5b: Content-Based Rule**
1. Enter categories: `Work, Entertainment`
2. Enter logic rules: `YouTube with "tutorial" or "coding" in title goes to Work, otherwise Entertainment`
3. Open tabs:
   - YouTube (search for "coding tutorial")
   - YouTube (search for "funny cats")
4. Click "🔍 Analyze & Preview"

**Expected Result**:
- ✅ Tutorial video → Work
- ✅ Entertainment video → Entertainment

**Test 5c: Multiple Rules**
1. Enter categories: `Work, Shopping, Social`
2. Enter logic rules:
   ```
   GitHub goes to Work.
   Amazon and eBay go to Shopping.
   Twitter and Facebook go to Social.
   ```
3. Open relevant test tabs
4. Click "🔍 Analyze & Preview"

**Expected Result**:
- ✅ All rules respected
- ✅ Tabs categorized according to rules

---

### Test 6: Duplicate Tab Removal

**Objective**: Verify duplicate detection and removal

**Test 6a: With Duplicates - Removal Enabled**
1. Enter valid API key and categories
2. Check "Remove duplicate tabs"
3. Open test tabs (use test-tabs.html → "Open Duplicates")
   - Should open 10 tabs (5 pairs of duplicates)
4. Note tab count before analysis
5. Click "🔍 Analyze & Preview"

**Expected Result**:
- ✅ Duplicates detected
- ✅ Status message shows duplicates found
- ✅ Preview shows reduced tab count
- ✅ Only unique tabs remain

**Test 6b: With Duplicates - Removal Disabled**
1. Uncheck "Remove duplicate tabs"
2. Open test tabs (use test-tabs.html → "Open Duplicates")
3. Click "🔍 Analyze & Preview"

**Expected Result**:
- ✅ All 10 tabs included in analysis
- ✅ Duplicates not removed
- ✅ Both copies appear in preview

**Validation**:
```javascript
// Count tabs before and after
chrome.tabs.query({}, (tabs) => console.log('Total tabs:', tabs.length));
```

---

### Test 7: Tab Analysis and Preview

**Objective**: Verify AI analysis and preview functionality

**Test 7a: Basic Analysis**
1. Enter valid API key
2. Enter categories: `Work, Shopping, Social, Research, Entertainment`
3. Open test tabs (use test-tabs.html → "Open All Test Tabs")
4. Click "🔍 Analyze & Preview"
5. Wait for analysis to complete

**Expected Result**:
- ✅ "Analyzing tabs..." status appears
- ✅ Progress indication shown
- ✅ Preview section displays with results
- ✅ Each category shows tab count
- ✅ Tab titles listed under each category
- ✅ "✨ Apply Sorting" button appears

**Test 7b: Large Tab Set**
1. Open 50+ tabs across various sites
2. Click "🔍 Analyze & Preview"

**Expected Result**:
- ✅ Analysis completes (may take 10-15 seconds)
- ✅ All tabs categorized
- ✅ Preview scrollable if needed
- ✅ No timeout errors

**Test 7c: Re-Analysis**
1. Complete an analysis
2. Modify categories
3. Click "🔍 Analyze & Preview" again

**Expected Result**:
- ✅ Previous results cleared
- ✅ New analysis runs
- ✅ New results reflect updated categories

---

### Test 8: Organization Mode - Separate Windows

**Objective**: Verify separate windows organization mode

**Prerequisites**: Workspace bridge NOT required for this mode

**Steps**:
1. Enter valid API key and categories: `Work, Shopping, Social`
2. Select "Separate Windows" mode
3. Open test tabs:
   - GitHub.com (Work)
   - Amazon.com (Shopping)
   - Twitter.com (Social)
4. Click "🔍 Analyze & Preview"
5. Review preview
6. Click "✨ Apply Sorting"

**Expected Result**:
- ✅ Three new windows created
- ✅ "Work" window contains GitHub tab
- ✅ "Shopping" window contains Amazon tab
- ✅ "Social" window contains Twitter tab
- ✅ Original tabs closed
- ✅ Success message displayed

**Validation**:
```javascript
// Check window count
chrome.windows.getAll({populate: true}, (windows) => {
  console.log('Total windows:', windows.length);
  windows.forEach(w => console.log('Window tabs:', w.tabs.length));
});
```

---

### Test 9: Organization Mode - Tab Stacks

**Objective**: Verify tab stacks/groups organization mode

**Prerequisites**: Workspace bridge NOT required for this mode

**Steps**:
1. Enter valid API key and categories: `Work, Shopping, Social`
2. Select "Tab Stacks" mode
3. Open test tabs in current window:
   - GitHub.com
   - Stackoverflow.com
   - Amazon.com
   - eBay.com
   - Twitter.com
   - Facebook.com
4. Click "🔍 Analyze & Preview"
5. Review preview
6. Click "✨ Apply Sorting"

**Expected Result**:
- ✅ Tabs remain in current window
- ✅ Tabs grouped by category
- ✅ Each group has a colored label
- ✅ Group names match categories
- ✅ Tabs can be collapsed/expanded by group
- ✅ Success message displayed

**Validation**:
- Visual inspection of tab bar
- Groups should be visible and labeled
- Click group name to collapse/expand

---

### Test 10: Organization Mode - Vivaldi Workspaces

**Objective**: Verify Vivaldi Workspaces organization mode

**Prerequisites**: 
- Vivaldi bridge script must be installed (see INSTALL.md)
- Vivaldi must be restarted after bridge installation

**Test 10a: Verify Bridge Installation**
1. Open Vivaldi DevTools (F12)
2. Go to Console tab
3. Type: `typeof vivaldi !== 'undefined' && vivaldi.tabsPrivate`

**Expected Result**:
- ✅ Returns object (not undefined)
- If undefined, bridge not installed correctly

**Test 10b: Workspace Organization - Existing Workspaces**
1. Manually create workspaces in Vivaldi:
   - "Work" workspace
   - "Shopping" workspace
2. Enter API key and categories: `Work, Shopping, Personal`
3. Select "Vivaldi Workspaces" mode
4. Open test tabs
5. Click "🔍 Analyze & Preview"
6. Click "✨ Apply Sorting"

**Expected Result**:
- ✅ Tabs moved to matching workspaces
- ✅ "Work" tabs → Work workspace
- ✅ "Shopping" tabs → Shopping workspace
- ✅ "Personal" workspace created automatically
- ✅ Can switch between workspaces to verify

**Test 10c: Workspace Organization - New Workspaces**
1. Delete all existing workspaces
2. Enter categories: `Code, Docs, Testing`
3. Select "Vivaldi Workspaces" mode
4. Open diverse test tabs
5. Click "🔍 Analyze & Preview"
6. Click "✨ Apply Sorting"

**Expected Result**:
- ✅ Three new workspaces created
- ✅ Workspace names match categories
- ✅ Tabs distributed correctly
- ✅ Can navigate using workspace switcher

**Test 10d: Bridge Communication Fallback**
1. If bridge script not installed
2. Select "Vivaldi Workspaces" mode
3. Try to apply sorting

**Expected Result**:
- ❌ Error message: "Workspace mode requires the Vivaldi bridge script"
- ✅ Instructions or link to INSTALL.md
- ✅ No crash or hanging

**Validation**:
- Open Vivaldi Workspace Panel (button in sidebar)
- Verify workspaces exist with correct names
- Switch between workspaces to see tabs

---

### Test 11: Error Handling

**Objective**: Verify graceful error handling

**Test 11a: Network Error**
1. Disconnect internet
2. Enter valid API key and categories
3. Open test tabs
4. Click "🔍 Analyze & Preview"

**Expected Result**:
- ❌ Error message: Network or connection error
- ✅ User-friendly message (not raw error)
- ✅ Extension remains functional

**Test 11b: Invalid API Response**
1. Use API key that returns malformed JSON
2. Try to analyze tabs

**Expected Result**:
- ❌ Error about parsing API response
- ✅ Helpful error message
- ✅ No extension crash

**Test 11c: Rate Limiting**
1. Make multiple rapid API calls (5+ in quick succession)
2. Check for rate limit handling

**Expected Result**:
- ✅ Rate limit warning may appear
- ✅ Requests properly spaced
- ✅ No API quota exceeded errors

---

### Test 12: Edge Cases

**Test 12a: Empty Window**
1. Close all tabs except extension popup
2. Try to analyze

**Expected Result**:
- ✅ Warning: "No tabs to organize" or similar
- ✅ No crash

**Test 12b: Very Long Tab Title**
1. Open tab with extremely long title (100+ characters)
2. Analyze tabs

**Expected Result**:
- ✅ Tab analyzed correctly
- ✅ Title truncated in display if needed
- ✅ No overflow issues

**Test 12c: Special Characters in URLs**
1. Open tabs with special characters (unicode, emojis)
2. Analyze tabs

**Expected Result**:
- ✅ URLs handled correctly
- ✅ No encoding errors
- ✅ Tabs categorized properly

**Test 12d: Pinned Tabs**
1. Pin several tabs
2. Analyze and organize

**Expected Result**:
- ✅ Pinned tabs included in analysis
- ✅ Pinned state preserved (if possible)
- ✅ Or clear documentation of behavior

**Test 12e: YouTube Mixed Content**
1. Use test-tabs.html → "Open YouTube Mix"
2. Enter categories including "Work" and "Entertainment"
3. Add logic rules about YouTube
4. Analyze tabs

**Expected Result**:
- ✅ Work-related YouTube → Work
- ✅ Entertainment YouTube → Entertainment
- ✅ Logic rules applied correctly

---

### Test 13: Performance Tests

**Test 13a: 10 Tabs**
1. Open 10 diverse tabs
2. Click "🔍 Analyze & Preview"
3. Time the analysis

**Expected Result**:
- ✅ Completes in < 5 seconds
- ✅ UI remains responsive

**Test 13b: 50 Tabs**
1. Open 50 tabs
2. Analyze

**Expected Result**:
- ✅ Completes in < 15 seconds
- ✅ No timeout errors

**Test 13c: 100+ Tabs**
1. Open 100+ tabs (if system allows)
2. Analyze

**Expected Result**:
- ✅ Completes within reasonable time (30-60 seconds)
- ✅ Or proper chunking/batching with progress
- ✅ No memory issues

**Test 13d: Multiple Windows**
1. Open tabs across 5 different windows
2. Analyze

**Expected Result**:
- ✅ Tabs from all windows included
- ✅ "Flattening" message shown
- ✅ All tabs categorized

---

### Test 14: UI/UX Tests

**Test 14a: Responsive Design**
1. Resize popup window (if possible)
2. Check on different screen sizes

**Expected Result**:
- ✅ UI scales appropriately
- ✅ No overflow or cutoff
- ✅ Buttons remain accessible

**Test 14b: Status Messages**
1. Perform various actions
2. Observe status messages

**Expected Result**:
- ✅ Clear, descriptive messages
- ✅ Color-coded (success=green, error=red)
- ✅ Auto-dismiss or stay visible appropriately

**Test 14c: Loading States**
1. Click "🔍 Analyze & Preview"
2. Observe loading state

**Expected Result**:
- ✅ Button disabled during processing
- ✅ Loading indicator or animation
- ✅ Status text updates

**Test 14d: Accessibility**
1. Navigate using keyboard only (Tab key)
2. Try screen reader (if available)

**Expected Result**:
- ✅ All controls accessible via keyboard
- ✅ Logical tab order
- ✅ ARIA labels present (check in DOM)

---

### Test 15: Security Tests

**Test 15a: API Key Storage**
1. Enter API key
2. Open DevTools → Application → Storage → Local Storage
3. Check chrome.storage.local

**Expected Result**:
- ✅ API key stored in chrome.storage.local
- ✅ Not visible in localStorage
- ✅ Masked in UI (••••••••)

**Test 15b: Content Security**
1. Open DevTools → Console
2. Check for CSP violations

**Expected Result**:
- ✅ No CSP errors
- ✅ No inline script warnings

**Test 15c: XSS Prevention**
1. Try entering `<script>alert('xss')</script>` in categories
2. Analyze tabs

**Expected Result**:
- ✅ Script not executed
- ✅ Treated as plain text
- ✅ No alert popup

---

## Test Checklist

Use this checklist to track testing progress:

### Installation & Setup
- [ ] Extension installs without errors
- [ ] UI loads correctly
- [ ] Validation script passes
- [ ] Test tabs generator works

### Core Functionality
- [ ] Settings persist across sessions
- [ ] API key validation works
- [ ] Category parsing works
- [ ] Logic rules applied correctly
- [ ] Duplicate removal works
- [ ] Tab analysis completes
- [ ] Preview displays correctly

### Organization Modes
- [ ] Separate Windows mode works
- [ ] Tab Stacks mode works
- [ ] Vivaldi Workspaces mode works (with bridge)

### Error Handling
- [ ] Empty API key handled
- [ ] Invalid API key handled
- [ ] Network errors handled
- [ ] Invalid responses handled
- [ ] Edge cases handled

### Performance
- [ ] Small tab sets (10 tabs)
- [ ] Medium tab sets (50 tabs)
- [ ] Large tab sets (100+ tabs)
- [ ] Multiple windows handled

### Security
- [ ] API key stored securely
- [ ] No XSS vulnerabilities
- [ ] CSP compliance

---

## Reporting Issues

When reporting test failures, include:

1. **Test ID**: (e.g., Test 8: Organization Mode - Separate Windows)
2. **Vivaldi Version**: (e.g., 6.5.3206.50)
3. **Operating System**: (e.g., Windows 11, macOS 14, Ubuntu 22.04)
4. **Steps to Reproduce**: Exact steps taken
5. **Expected Result**: What should happen
6. **Actual Result**: What actually happened
7. **Console Errors**: Any errors from DevTools Console
8. **Screenshots**: If applicable

### Example Issue Report

```markdown
**Test ID**: Test 9 - Tab Stacks Mode
**Vivaldi Version**: 6.5.3206.50
**OS**: Windows 11

**Steps**:
1. Selected Tab Stacks mode
2. Analyzed 6 tabs
3. Clicked Apply Sorting

**Expected**: Tabs grouped with colored labels
**Actual**: Groups created but no colors applied

**Console Errors**:
```
Error: tabGroups.update failed
```

**Screenshot**: [attached]
```

---

## Automation Potential

While this guide is for manual testing, these tests could be automated using:

1. **Selenium WebDriver**: For browser automation
2. **Puppeteer**: For Chrome/Chromium-based testing
3. **Playwright**: For cross-browser testing
4. **Vivaldi Testing APIs**: If available

### Example Automated Test (Pseudocode)

```javascript
// Test 2: Settings Persistence
async function testSettingsPersistence() {
  const driver = await new Builder().forBrowser('chrome').build();
  
  try {
    // Navigate to extension
    await driver.get('vivaldi://extensions');
    
    // Click extension icon
    await driver.findElement(By.id('extension-icon')).click();
    
    // Enter settings
    await driver.findElement(By.id('apiKey')).sendKeys('test-key');
    await driver.findElement(By.id('categories')).sendKeys('Work, Personal');
    
    // Close and reopen
    await driver.findElement(By.css('.close-button')).click();
    await driver.findElement(By.id('extension-icon')).click();
    
    // Verify
    const categories = await driver.findElement(By.id('categories')).getAttribute('value');
    assert.equal(categories, 'Work, Personal');
    
    console.log('✅ Test 2 passed');
  } finally {
    await driver.quit();
  }
}
```

---

## Continuous Testing

### Daily Smoke Tests (5 minutes)
- [ ] Extension loads
- [ ] Basic analysis works
- [ ] One organization mode works

### Weekly Full Tests (30 minutes)
- [ ] All core functionality tests
- [ ] All organization modes
- [ ] Basic error handling

### Pre-Release Tests (1 hour)
- [ ] Complete test suite
- [ ] All edge cases
- [ ] Performance tests
- [ ] Security tests

---

## Known Limitations

Document any known limitations discovered during testing:

1. **Rate Limiting**: Gemini API has rate limits (15 RPM free tier)
2. **Tab Limit**: Browser may limit total open tabs
3. **Workspace Bridge**: Requires manual installation
4. **API Quota**: Free tier limited to 1500 requests/day
5. **Update Persistence**: Bridge script needs reinstallation after Vivaldi updates

---

## Success Criteria

All tests pass when:
- ✅ No critical errors occur
- ✅ Core functionality works as documented
- ✅ Error messages are user-friendly
- ✅ Performance is acceptable (< 30s for 100 tabs)
- ✅ UI is responsive and accessible
- ✅ Security measures are in place

---

## Conclusion

This manual testing guide provides comprehensive coverage of all extension functionality. While automated testing would be ideal, manual testing following this guide ensures:

1. ✅ **Comprehensive Coverage**: All features tested
2. ✅ **Real-World Scenarios**: Actual browser behavior
3. ✅ **User Experience**: UX issues identified
4. ✅ **Edge Cases**: Boundary conditions verified
5. ✅ **Documentation**: Issues properly reported

**Note**: As an AI assistant, I cannot personally download Vivaldi and execute these tests, but this guide enables you or any tester to perform thorough validation of all extension functions.

---

**Last Updated**: 2026-01-13
**Version**: 1.0
**Status**: Ready for Testing ✅
