# Vivaldi Alternatives: Beyond Browser Extensions

## ⚠️ Important: Vivaldi Extension API Limitations

**Reality Check**: While Vivaldi is Chromium-based, it **does NOT fully support all Chrome extension APIs**. Specifically:

- ❌ **`chrome.tabGroups` API is NOT supported** in Vivaldi (Tab Stacks mode won't work)
- ❌ Some Chrome Extension APIs are incomplete or buggy in Vivaldi
- ⚠️ **Extensions designed for Chrome often don't work properly in Vivaldi**

### What DOES Work in Vivaldi?

✅ **Vivaldi Workspaces Mode** (with bridge script):
- Uses native Vivaldi APIs via the `ai_bridge.js` injection
- This is the ONLY fully functional mode for this extension

✅ **Separate Windows Mode**:
- Uses standard `chrome.windows` API which Vivaldi supports
- Creates separate windows for each category

❌ **Tab Stacks Mode** (Chrome's Tab Groups):
- Does NOT work - Vivaldi doesn't support `chrome.tabGroups` API
- Vivaldi has its own tab stacking, but it's not accessible via Chrome extension APIs

### The Problem with Extensions in Vivaldi

While Vivaldi can load Chrome extensions, it doesn't implement all the APIs. This means:
- Many Chrome extensions don't work or work partially
- Vivaldi-specific features (Workspaces, native Tab Stacks) aren't accessible via standard Chrome APIs
- **You need alternative approaches to work with Vivaldi's unique features**

### This Extension's Current Approach

This project uses a **hybrid approach** to work around Vivaldi's limitations:
1. **Chrome Extension**: Provides the UI and basic tab management
2. **Bridge Script**: Injects JavaScript into Vivaldi's UI to access native Vivaldi APIs

This gives you:
- ⚠️ Limited extension functionality (Windows mode only)
- ✅ Full Vivaldi features via bridge script (Workspaces mode)

---

## Why You NEED Alternatives for Vivaldi

Given Vivaldi's incomplete Chrome extension API support, **alternatives are not just "nice to have" - they're necessary** for full functionality. Here are your real options:

### Currently Working Solutions

1. **Vivaldi UI Modifications (Recommended)** ✅
   - Inject JavaScript directly into Vivaldi's UI
   - Full access to Vivaldi's native APIs
   - What this extension already does with `ai_bridge.js`
   
2. **Separate Windows Mode** ✅
   - Uses basic `chrome.windows` API
   - Works without any modifications
   - Less powerful than Workspaces

---

## ⭐ Can We Make a Vivaldi-Specific Extension? YES!

**This is the right question to ask!** Instead of trying to make Chrome extensions work in Vivaldi, you can create a **Vivaldi-native implementation**.

### Option 1: Chrome Extension with Embedded Vivaldi API ⭐ RECOMMENDED

**The best solution:** A Chrome extension that **auto-injects its own Vivaldi API bridge**.

👉 **See [CHROME_EXTENSION_WITH_VIVALDI.md](CHROME_EXTENSION_WITH_VIVALDI.md)** for:
- How to create a Chrome extension that includes Vivaldi API access
- Auto-injecting bridge script (no manual file editing!)
- Complete code examples for manifest, content script, and bridge
- Benefits: Single installation, easier updates, standard extension distribution

**Key benefits:**
- ✅ Install like a normal Chrome extension (no manual file editing)
- ✅ Automatically injects Vivaldi API bridge when needed
- ✅ Full access to `vivaldi.workspaces` and other Vivaldi APIs
- ✅ Updates don't require re-editing system files
- ✅ Self-contained package - all code in one extension

### Option 2: Pure Vivaldi Mod (Advanced Users)

See **[VIVALDI_NATIVE.md](VIVALDI_NATIVE.md)** for:
- Creating a pure Vivaldi-specific implementation
- Full access to Vivaldi's native APIs
- Better integration with Vivaldi's UI
- Code examples and implementation guide

**Key benefits:**
- ✅ Full access to ALL Vivaldi APIs directly
- ✅ Can add buttons to toolbar, create panels, etc.
- ✅ More powerful than extension approach
- ❌ Requires manual installation (editing system files)
- ❌ Breaks on Vivaldi updates

### Quick Comparison:

1. **Chrome Extension + Auto-Injecting Bridge** ⭐ RECOMMENDED
   - Install like normal extension
   - Auto-injects Vivaldi API access
   - Easiest for users

2. **Pure Vivaldi Mod**
   - Most powerful
   - Manual installation required
   - Best for advanced users

3. **Standalone Desktop App**
   - External program
   - Most flexible architecture

**See [CHROME_EXTENSION_WITH_VIVALDI.md](CHROME_EXTENSION_WITH_VIVALDI.md) and [VIVALDI_NATIVE.md](VIVALDI_NATIVE.md) for full details, code examples, and implementation guides.**

---

### Better Alternatives (Not Yet Implemented)

If you prefer NOT to use the bridge script approach or need more flexibility, here are practical alternatives:

### 1. Standalone Desktop Application ⭐ RECOMMENDED ALTERNATIVE

**What it is**: A native desktop app that communicates with Vivaldi via the Chrome DevTools Protocol.

**Why this is better for Vivaldi**:
- ✅ No reliance on incomplete Chrome extension APIs
- ✅ Can use Chrome DevTools Protocol (CDP) which Vivaldi fully supports
- ✅ More control and doesn't break on Vivaldi updates
- ✅ Can potentially access Vivaldi's internal APIs more reliably

**How it would work**:
```
Desktop App (Python/Electron/Go)
    ↓ (Chrome DevTools Protocol)
Vivaldi Browser
    ↓ (Internal APIs)
Vivaldi Workspaces, Tabs, etc.
```

**Pros**:
- ✅ Works around Vivaldi's incomplete extension API support
- ✅ Can run independently of the browser
- ✅ More control over system resources
- ✅ Can integrate with other desktop tools
- ✅ No need to modify Vivaldi's internal files

**Cons**:
- ❌ More complex to install and configure
- ❌ Requires running an additional program
- ❌ Need to manage updates separately
- ❌ Security concern: Need to enable remote debugging in Vivaldi
- ❌ May still not access Vivaldi-specific features directly

**Example Setup**:
```bash
# Start Vivaldi with remote debugging
vivaldi --remote-debugging-port=9222

# Run standalone app
python tab-sorter-app.py
```

**When to use**: If you need to integrate tab management with other desktop automation tools or prefer standalone applications.

---

### 2. Userscript (Tampermonkey/Greasemonkey)

**What it is**: JavaScript code injected into web pages using a userscript manager.

**How it would work**:
```
Userscript Manager Extension (Tampermonkey)
    ↓ (Injects JavaScript)
Web Pages
```

**Pros**:
- ✅ Lighter weight than full extension
- ✅ Easy to modify and customize
- ✅ Can be shared as simple .js files

**Cons**:
- ❌ Still requires an extension (the userscript manager)
- ❌ Very limited browser API access
- ❌ Cannot access chrome.tabs API
- ❌ Cannot create tab groups or workspaces
- ❌ Only runs on specific web pages, not globally
- ❌ Poor solution for tab management

**When to use**: **NOT RECOMMENDED** for tab management - userscripts are designed for modifying web page content, not browser behavior.

---

### 3. Bookmarklet

**What it is**: JavaScript code stored in a bookmark that runs when clicked.

**How it would work**:
```javascript
javascript:(function(){
  // Limited JavaScript code here
  alert('This runs on the current page');
})();
```

**Pros**:
- ✅ No installation required
- ✅ Simple to share
- ✅ Works in any browser

**Cons**:
- ❌ Extremely limited functionality
- ❌ Cannot access browser APIs
- ❌ Cannot manipulate tabs
- ❌ Only affects current page
- ❌ Cannot communicate with external APIs
- ❌ Not practical for complex tasks

**When to use**: **NOT VIABLE** for AI-powered tab sorting.

---

### 4. Command-Line Tool with Browser Integration

**What it is**: A CLI tool that controls the browser via the Chrome DevTools Protocol.

**How it would work**:
```bash
# Install CLI tool
npm install -g vivaldi-tab-sorter

# Configure API key
vivaldi-tab-sorter config --api-key YOUR_KEY

# Sort tabs
vivaldi-tab-sorter sort --categories "Work,Personal,Shopping"
```

**Pros**:
- ✅ No browser extension needed
- ✅ Can be automated with scripts
- ✅ Good for power users and scripting
- ✅ Can integrate with shell workflows

**Cons**:
- ❌ Requires Node.js or Python runtime
- ❌ More complex installation process
- ❌ Need to enable remote debugging
- ❌ Cannot access Vivaldi-specific APIs
- ❌ Less intuitive for non-technical users
- ❌ Security concerns with remote debugging

**When to use**: If you're a power user who prefers CLI tools and wants to integrate tab management into scripts.

---

### 5. Web Service with Browser Integration

**What it is**: A web app that you authorize to access your browser via OAuth or similar.

**How it would work**:
```
Web Service (https://tab-sorter.com)
    ↓ (OAuth/API)
Browser Extension Helper (minimal)
    ↓
Vivaldi Tabs
```

**Pros**:
- ✅ No need to install API keys locally
- ✅ Can sync settings across devices
- ✅ Easier updates (server-side)
- ✅ Can offer premium features

**Cons**:
- ❌ Still requires a minimal browser extension
- ❌ Privacy concerns (tabs sent to external server)
- ❌ Requires internet connection
- ❌ Potential subscription costs
- ❌ Less control over data
- ❌ Trust required in third-party service

**When to use**: **NOT RECOMMENDED** for privacy-conscious users. The current extension keeps all data local.

---

### 6. Vivaldi Modifications (Mods)

**What it is**: Custom JavaScript injected directly into Vivaldi's UI files.

**How it would work**:
- Modify Vivaldi's `window.html` or other UI files
- Add custom JavaScript directly
- Similar to what we do with `ai_bridge.js`, but more extensive

**Pros**:
- ✅ No extension needed
- ✅ Full access to Vivaldi internals
- ✅ Can deeply integrate with UI
- ✅ Maximum customization

**Cons**:
- ❌ Must be reinstalled after every Vivaldi update
- ❌ Risk of breaking Vivaldi functionality
- ❌ Difficult to maintain
- ❌ No standard distribution method
- ❌ Requires manual file editing
- ❌ Security risks if downloading from untrusted sources

**Current approach**: We already use a minimal version of this (the `ai_bridge.js` script) to access Workspace APIs, but keep the main functionality as an extension for easier management.

**When to use**: Only if you're very technical and want maximum customization. Our hybrid approach is safer.

---

## Comparison Table

| Approach | Installation | Maintenance | Vivaldi Features | Privacy | Best For |
|----------|-------------|-------------|------------------|---------|----------|
| **Browser Extension Only** | Easy (5/5) | Easy (5/5) | ❌ Limited (1/5) | Excellent - Local (5/5) | **Not recommended for Vivaldi** |
| **Extension + Bridge Script** (Current) | Moderate (4/5) | Moderate (3/5) | ✅ Full via Bridge (4/5) | Excellent - Local (5/5) | **Current best solution** |
| **Desktop App** | Complex (2/5) | Easy (4/5) | Potentially Better (3/5) | Excellent - Local (5/5) | **Recommended alternative** |
| **CLI Tool** | Complex (2/5) | Moderate (3/5) | Limited (2/5) | Excellent - Local (5/5) | Scripters |
| **Userscript** | Moderate (3/5) | Easy (4/5) | ❌ Minimal (1/5) | Good - Local (4/5) | Not suitable |
| **Web Service** | Easy (4/5) | Easy (5/5) | Good (3/5) | Poor - Remote (2/5) | Not recommended |
| **Vivaldi Mods Only** | Very Complex (1/5) | Very Hard (1/5) | ✅ Full (5/5) | Excellent - Local (5/5) | Advanced users only |

---

## Our Recommendation: Choose Based on Your Needs

### Current Reality with Vivaldi:

**The Hybrid Approach (Extension + Bridge Script)** is currently the best compromise, but it has limitations:

✅ **What Works:**
- Vivaldi Workspaces mode (with bridge script)
- Separate Windows mode
- AI categorization and preview

❌ **What Doesn't Work:**
- Tab Stacks mode (Chrome's `tabGroups` API not supported in Vivaldi)
- Some Chrome extension features may be buggy

### For Most Users: Stick with the Current Hybrid Approach

The current implementation (Extension + Bridge Script) provides:
1. **✅ Easy Installation**: Load extension + inject one script
2. **✅ Privacy**: Everything runs locally
3. **✅ Vivaldi Workspaces**: Access via bridge script
4. **✅ Windows Mode**: Standard API that works
5. **⚠️ Limitations**: No Tab Stacks mode, may have bugs

### If You Want Better Alternatives:

**Consider a Desktop Application** if:
- You're comfortable with command-line tools
- You want more reliability than browser extensions provide
- You need better integration with Vivaldi's features
- You're willing to run a separate program

**Why a desktop app could be better:**
- Chrome DevTools Protocol is more stable than extension APIs
- Could potentially interact with Vivaldi's internals more reliably
- Doesn't depend on Vivaldi's incomplete extension API implementation
- More future-proof as Vivaldi updates

---

## The Truth About Vivaldi and Extensions

**Vivaldi is Chromium-based**, but that **doesn't mean Chrome extensions work perfectly**:

### What Vivaldi Does Support:
- ✅ Basic Chrome extension loading
- ✅ `chrome.tabs` API (mostly)
- ✅ `chrome.windows` API (mostly)
- ✅ `chrome.storage` API
- ✅ Basic extension framework

### What Vivaldi Doesn't Support:
- ❌ `chrome.tabGroups` API (Tab Groups)
- ❌ Some newer Chrome extension APIs
- ⚠️ Buggy or incomplete implementation of some APIs

### Vivaldi's Native Features:
Vivaldi has powerful features (Workspaces, Tab Stacking, Notes, etc.) that are **NOT accessible via standard Chrome extension APIs**. To use them, you must:
1. Use Vivaldi's internal JavaScript APIs (requires injection)
2. Use external tools (desktop apps, scripts)
3. Manually organize tabs

---

## The Hybrid Approach (Current Implementation)

This project uses a creative workaround for Vivaldi's limitations:

```
┌─────────────────────────────────────┐
│  Chrome Extension                   │
│  - UI and user input                │
│  - AI API calls                     │
│  - Tab enumeration                  │
│  - Windows mode organization        │
└─────────────┬───────────────────────┘
              │
              ↓ (chrome.storage communication)
┌─────────────────────────────────────┐
│  Bridge Script (Injected)           │
│  - Access vivaldi.workspaces API    │
│  - Create/manage Workspaces         │
│  - Move tabs between Workspaces     │
└─────────────────────────────────────┘
```

**Limitations of this approach:**
- Breaks after Vivaldi updates (must re-inject script)
- Only provides access to Workspaces
- Still relies on extension for UI and AI calls
- Tab Stacks mode doesn't work (needs `tabGroups` API)

---

## If You Really Want an Alternative...

If you absolutely need a non-extension solution, we recommend:

### Option A: Desktop Application
Best for users who want a standalone tool and don't mind additional setup.

**Quick concept**:
```python
# tab-sorter.py - Standalone Desktop App Concept
from cdp import CDP  # Chrome DevTools Protocol library

# Connect to Vivaldi
cdp = CDP('localhost', 9222)

# Get all tabs
tabs = cdp.get_tabs()

# Analyze with Gemini (gemini_api would handle the requests)
categories = gemini_api.analyze(tabs)

# Organize tabs
cdp.organize_tabs(categories)
```

**To use**:
1. Start Vivaldi with: `vivaldi --remote-debugging-port=9222`
2. Run: `python tab-sorter.py`

**Note**: This loses access to Vivaldi Workspaces and Tab Stacks.

### Option B: CLI Tool
Best for power users who want scripting capabilities.

**Quick concept**:
```bash
#!/bin/bash
# tab-sorter.sh

# Start Vivaldi with remote debugging if not running
vivaldi --remote-debugging-port=9222 &

# Run tab sorter (reads API key from environment or config file)
node tab-sorter-cli.js \
  --categories "Work,Personal,Shopping" \
  --mode windows
```

**Note**: For security, API keys should be stored in environment variables or secure config files, not passed as command-line arguments.

---

## FAQ

### Q: Why not just use Tab Stacks without any extension?
**A**: Vivaldi's built-in tab stacking is manual. Our extension adds AI-powered automatic categorization with hundreds of tabs.

### Q: Can I use Vivaldi's built-in tab management instead?
**A**: Yes! Vivaldi has powerful manual tab management. Our extension adds AI automation for users with hundreds of tabs.

### Q: Will this extension work with future Vivaldi updates?
**A**: Yes! Since it's a standard Chrome extension, it's compatible with all Chromium-based browsers. The bridge script may need reinstallation after major Vivaldi updates.

### Q: Can I use this extension with Chrome or Edge?
**A**: Yes for basic functionality (Tab Stacks and Windows modes), but Workspaces are Vivaldi-specific. The bridge script only works with Vivaldi.

### Q: Is there a way to avoid the bridge script installation?
**A**: Yes! Use Tab Stacks or Separate Windows modes. These work perfectly without any Vivaldi modifications. Only Workspaces mode requires the bridge script.

---

## Conclusion

**For 99% of users**: The browser extension (with optional bridge script) is the **best, simplest, and most powerful solution**.

**Vivaldi fully supports Chrome extensions**, so there's no compatibility issue. The extension approach gives you:
- Easy installation and updates
- Full access to browser APIs
- Privacy (everything local)
- Optional Vivaldi-specific features via bridge script

If you have specific requirements that necessitate an alternative (e.g., integrating with other automation tools), consider a desktop app or CLI tool, but be prepared for increased complexity and reduced functionality.

---

**Bottom line**: Don't let the term "Chrome extension" fool you - this works great with Vivaldi! Give it a try. 🚀
