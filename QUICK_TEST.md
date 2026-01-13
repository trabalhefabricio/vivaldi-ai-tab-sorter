# Quick Testing Guide

## ⚡ 5-Minute Smoke Test

If you just want to verify the extension works, follow these steps:

### 1. Install Extension
```
1. Open vivaldi://extensions
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select this directory
```

### 2. Get API Key
- Visit https://aistudio.google.com/app/apikey
- Create and copy your Gemini API key

### 3. Basic Test
```
1. Click extension icon
2. Paste API key
3. Enter categories: Work, Personal, Entertainment
4. Open test-tabs.html → Click "Open All Test Tabs"
5. In extension popup, click "🔍 Analyze & Preview"
6. Wait for results
7. Click "✨ Apply Sorting"
```

### 4. Verify Results
- **For Separate Windows**: Check that new windows were created
- **For Tab Stacks**: Check that tabs are grouped in current window
- **For Workspaces**: Check Vivaldi Workspace Panel (requires bridge)

## ✅ Success Indicators

If you see:
- ✅ "Analysis complete" message
- ✅ Preview shows categorized tabs
- ✅ "Successfully organized X tabs" after applying
- ✅ Tabs are actually organized as expected

Then the extension is working! 🎉

## ❌ Common Issues

| Problem | Solution |
|---------|----------|
| "Please enter your Gemini API key" | Get valid API key from Google AI Studio |
| "Workspace mode requires bridge script" | Follow INSTALL.md to install bridge, or use Tab Stacks/Windows mode |
| "Error calling Gemini API" | Check API key, internet connection, and API quota |
| No tabs organized | Check console for errors (F12) |

## 📚 Full Testing

For comprehensive testing, see [MANUAL_TESTING.md](MANUAL_TESTING.md) which includes:
- 15 detailed test suites
- Expected results for each test
- Edge cases and error conditions
- Performance testing guidelines

## 🤖 Can AI Test This?

**No** - As an AI, I cannot:
- Download/install Vivaldi browser
- Run the extension
- Click buttons or interact with UI
- Make real API calls

**But I have provided**:
- Complete testing documentation
- Test procedures and expected results
- Validation scripts
- Test data generators

See [TESTING_NOTES.md](TESTING_NOTES.md) for full explanation.

## 📊 Test Report Template

After testing, document your results:

```
Vivaldi Version: _______
OS: _______
Date: _______

✅ Extension installed successfully
✅ Settings persist after closing
✅ Tab analysis works
✅ [Mode] organization works: Windows / Tab Stacks / Workspaces
❌ [Any issues found]

Overall Status: Ready for use / Needs fixes / Not working
```

## 🚀 Ready to Test?

1. Run: `bash validate.sh` (should pass all checks)
2. Follow 5-minute smoke test above
3. Report any issues with details

---

**Quick Links**:
- [Full Manual Testing Guide](MANUAL_TESTING.md) - Comprehensive test suites
- [Testing Notes](TESTING_NOTES.md) - AI testing limitations explained
- [Documentation](DOCUMENTATION.md) - Full feature documentation
- [Installation](INSTALL.md) - Detailed installation guide
- [Troubleshooting](TROUBLESHOOTING.md) - Problem solving guide
