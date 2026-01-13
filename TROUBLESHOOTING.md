# Troubleshooting Guide

This guide helps you solve common issues with the Vivaldi AI Tab Sorter extension.

## Table of Contents
- [Installation Issues](#installation-issues)
- [API Key Problems](#api-key-problems)
- [Workspace Mode Issues](#workspace-mode-issues)
- [Tab Sorting Issues](#tab-sorting-issues)
- [Performance Issues](#performance-issues)
- [General Debugging](#general-debugging)

---

## Installation Issues

### Extension Won't Load

**Problem**: Extension doesn't appear after loading unpacked

**Solutions**:
1. Make sure you selected the correct folder (the one containing manifest.json)
2. Check Developer mode is enabled in `vivaldi://extensions`
3. Look for error messages in the extensions page
4. Try reloading the extension (click the refresh icon)

**Check Console**:
```
1. Right-click extension icon → "Inspect popup"
2. Look for errors in the Console tab
```

### "Manifest file is missing or unreadable"

**Problem**: Error loading manifest.json

**Solutions**:
1. Verify manifest.json exists in the folder
2. Check manifest.json is valid JSON (use validate.sh)
3. Ensure file permissions allow reading
4. Try re-downloading/extracting the extension

### Icons Not Showing

**Problem**: Extension icon is blank or missing

**Solutions**:
1. Icons are minimal placeholders - this is expected
2. Create custom 16x16, 48x48, and 128x128 PNG icons
3. Place them in the `icons/` folder
4. Reload the extension

---

## API Key Problems

### "Please enter your Gemini API key"

**Problem**: Extension requires API key

**Solution**:
1. Visit https://aistudio.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API key"
4. Copy the entire key (starts with "AIza")
5. Paste into the extension

### "Error calling Gemini API"

**Problem**: API calls failing

**Possible Causes & Solutions**:

1. **Invalid API Key**
   - Verify key is correct
   - No extra spaces at beginning/end
   - Try generating a new key

2. **API Quota Exceeded**
   - Check quota at https://aistudio.google.com/
   - Wait for quota to reset (usually daily)
   - Consider upgrading your plan

3. **Network Issues**
   - Check internet connection
   - Try disabling VPN/proxy
   - Check firewall isn't blocking requests

4. **API Key Restrictions**
   - Remove any IP/domain restrictions in Google Cloud Console
   - Ensure key has access to Generative Language API

### "No response from Gemini API"

**Problem**: API returns empty response

**Solutions**:
1. Check API key has correct permissions
2. Verify Gemini API is enabled in your Google Cloud project
3. Try with fewer tabs (start with 10-20)
4. Check if Gemini service is down (unlikely)

---

## Workspace Mode Issues

### "Workspace mode requires the Vivaldi bridge script"

**Problem**: Bridge script not installed or not working

**Diagnosis**:
```
1. Open Vivaldi DevTools (F12)
2. Check Console for "Vivaldi AI Tab Sorter Bridge Script loaded"
3. If not present, bridge isn't loaded
```

**Solutions**:

1. **Verify Bridge Installation**:
   - Check ai_bridge.js is in the vivaldi folder
   - Check window.html has the script tag
   - Ensure script tag is BEFORE `</body>`

2. **Check File Paths**:
   - Windows: `C:\Users\[User]\AppData\Local\Vivaldi\Application\[version]\resources\vivaldi\`
   - macOS: `/Applications/Vivaldi.app/Contents/Versions/[version]/Vivaldi Framework.framework/Resources/vivaldi/`
   - Linux: `/opt/vivaldi/resources/vivaldi/`

3. **Restart Vivaldi Completely**:
   - Close all windows
   - Check Task Manager (Windows) or Activity Monitor (Mac) to ensure Vivaldi is closed
   - Restart Vivaldi

4. **Check Permissions** (Linux/Mac):
   ```bash
   ls -la /path/to/vivaldi/ai_bridge.js
   # Should be readable by your user
   ```

### "Vivaldi bridge script not responding"

**Problem**: Bridge script loaded but not working

**Solutions**:
1. Check browser console for bridge errors
2. Verify chrome.storage API is accessible
3. Try closing and reopening the extension popup
4. Restart Vivaldi completely

### Workspaces Created But Tabs Not Moving

**Problem**: Workspaces appear but tabs stay in place

**Possible Causes**:
1. Vivaldi API limitations with certain tab states
2. Pinned tabs can't be moved
3. Tabs in private windows can't be moved

**Solutions**:
1. Unpin tabs before sorting
2. Don't try to sort private/incognito tabs
3. Try with a fresh set of regular tabs

### Workspaces Not Named Correctly

**Problem**: Workspaces created with wrong names

**Solutions**:
1. Check category names don't have special characters
2. Ensure categories are comma-separated
3. Try simpler, shorter category names

---

## Tab Sorting Issues

### "Vivaldi tab stacking API is not available"

**Problem**: Tab Stacks mode fails with API not available error

**Solutions**:
1. **Ensure you're using Vivaldi browser** - This extension is specifically designed for Vivaldi
2. **Update Vivaldi** - Make sure you're using a recent version of Vivaldi
3. **Try a different mode** - Use Workspaces or Separate Windows mode instead
4. Check browser console (F12) for specific API errors

**Note**: This extension uses Vivaldi's proprietary `vivaldi.tabsPrivate` API, which is NOT available in Chrome or other Chromium browsers.

### Tabs Categorized Incorrectly

**Problem**: AI assigns tabs to wrong categories

**Solutions**:
1. Add more specific logic rules
2. Use more descriptive category names
3. Try fewer categories (3-5 works best)
4. Review preview and adjust rules
5. Re-run analysis after changing rules

**Example Better Rules**:
```
Instead of: "YouTube videos"
Use: "YouTube in Entertainment unless title has 'tutorial', 'how to', 'learn', then Work"
```

### Duplicate Removal Not Working

**Problem**: Duplicates still present after removal

**Possible Causes**:
1. URLs differ slightly (http vs https, with/without www)
2. URLs have different parameters
3. Tabs loading at the same time

**Solutions**:
1. Extension removes exact URL matches only
2. Manually close near-duplicate tabs
3. Use Vivaldi's built-in duplicate tab detector first

### Some Tabs Not Being Sorted

**Problem**: Some tabs ignored during sorting

**Possible Causes**:
1. System tabs (vivaldi://, chrome://)
2. Extensions pages
3. Empty tabs
4. Loading tabs

**This is expected** - system tabs can't be moved.

---

## Performance Issues

### "Analyzing with AI..." Takes Too Long

**Problem**: Analysis is slow

**Causes & Solutions**:

1. **Too Many Tabs**:
   - 200+ tabs can take 30-60 seconds
   - Consider sorting in batches
   - Close unused tabs first

2. **Slow Internet**:
   - API calls require good connection
   - Try on faster network

3. **API Rate Limiting**:
   - Wait a moment between attempts
   - Don't run analysis repeatedly in quick succession

### Extension Popup Slow to Open

**Problem**: Popup takes time to load

**Solutions**:
1. Normal for first load (loading settings)
2. Reload extension if consistently slow
3. Check browser console for errors

### Browser Becomes Unresponsive

**Problem**: Vivaldi freezes during sorting

**Solutions**:
1. Reduce number of tabs
2. Sort in smaller batches
3. Close other programs
4. Try with more RAM available

---

## General Debugging

### Enable Debug Mode

1. Open popup
2. Right-click → "Inspect"
3. Go to Console tab
4. Watch for error messages

### Check Extension Console

```
1. Go to vivaldi://extensions
2. Find "Vivaldi AI Tab Sorter"
3. Click "background page" or "service worker"
4. Check Console for errors
```

### Common Error Messages

**AI Response Parsing Errors**

The extension now provides detailed error messages for parsing issues:

1. **"Could not find JSON array in AI response"**
   - The AI returned text but no valid JSON array was found
   - The response may be empty or contain only explanatory text
   - Try running the analysis again - AI responses can vary

2. **"Invalid JSON format in AI response"**
   - The AI returned malformed JSON that couldn't be parsed
   - Try analyzing fewer tabs (reduces complexity)
   - Check your API key is valid and active
   - Consider simplifying your categories or logic rules

3. **"AI response is not a JSON array"**
   - The AI returned valid JSON but not in array format
   - Try rephrasing your categories to be more clear
   - Run the analysis again - this is usually temporary

4. **"AI returned an empty categorization list"**
   - The AI returned an empty array with no categorizations
   - Try rephrasing your categories or logic rules
   - Ensure your categories are clear and distinct

5. **"AI response items are missing required fields"**
   - The response is missing "id" or "category" fields
   - This is rare - try analyzing again
   - If it persists, check the browser console for more details

**"Cannot access chrome.tabs"**
- Extension permissions issue
- Reload extension
- Check manifest.json has correct permissions

**"Chrome runtime error"**
- Extension context invalidated
- Close popup and reopen
- Reload extension if persists

### Reset Extension Settings

```javascript
// Open extension popup
// Right-click → Inspect
// Run in Console:
chrome.storage.local.clear();
location.reload();
```

### Report Issues

When reporting bugs, include:
1. Vivaldi version (`vivaldi://version`)
2. Extension version
3. Error messages from console
4. Steps to reproduce
5. Number of tabs being sorted
6. Operating system

---

## After Vivaldi Updates

### Extension Stops Working

**Problem**: Extension worked before Vivaldi update

**Solutions**:
1. Bridge script needs reinstalling
2. Find new version folder
3. Re-add script tag to window.html
4. Copy ai_bridge.js to new location

**Quick Check**:
```
vivaldi://version
# Note the version number
# Navigate to that version's folder
```

### Workspace API Changed

**Problem**: Vivaldi changed workspace API

**Solutions**:
1. Check for extension updates
2. Report issue on GitHub
3. Use Tab Stacks or Windows mode temporarily

---

## Still Having Issues?

1. **Check Documentation**: Review DOCUMENTATION.md
2. **Check Examples**: See EXAMPLES.md for configuration help
3. **Run Validation**: Execute `./validate.sh` to check installation
4. **GitHub Issues**: Open an issue with detailed information
5. **Console Logs**: Always check browser console for specific errors

---

## Quick Diagnostic Checklist

- [ ] Extension installed and enabled
- [ ] Developer mode is ON
- [ ] Manifest.json is valid (run validate.sh)
- [ ] API key is entered and valid
- [ ] Categories are defined
- [ ] Internet connection is working
- [ ] For Workspaces: Bridge script installed
- [ ] For Workspaces: Vivaldi fully restarted
- [ ] No errors in browser console
- [ ] Tested with a small number of tabs first

If all checked and still not working, open a GitHub issue!
