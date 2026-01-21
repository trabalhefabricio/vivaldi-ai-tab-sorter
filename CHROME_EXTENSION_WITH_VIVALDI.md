# Chrome Extension with Embedded Vivaldi API Support

## Yes! We Can Make a Chrome Extension That Uses Vivaldi APIs! ✅

This is actually the best approach - a **Chrome extension that includes its own Vivaldi API bridge**. Here's how to do it properly:

---

## The Solution: Self-Contained Extension with Auto-Installing Bridge

Instead of requiring users to manually inject the bridge script, we can make the extension **automatically inject itself** into Vivaldi's context and access Vivaldi APIs.

### Architecture

```
Chrome Extension Package
├── manifest.json              (Extension manifest)
├── popup.html / popup.js      (User interface)
├── background.js              (Extension logic)
├── vivaldi-bridge.js          (Vivaldi API access - gets auto-injected)
└── content-script.js          (Injects the bridge into Vivaldi's context)
```

### How It Works

1. **Extension loads** as a normal Chrome extension
2. **Content script** runs in Vivaldi's UI context
3. **Bridge script** gets injected into the page context (where `vivaldi.*` APIs are available)
4. **Communication** happens via `window.postMessage` or `chrome.storage`
5. **User sees** a single extension that "just works"

---

## Implementation: Updated Manifest

```json
{
  "manifest_version": 3,
  "name": "Vivaldi AI Tab Sorter",
  "version": "2.0.0",
  "description": "AI-powered tab organizer with native Vivaldi Workspace support",
  
  "permissions": [
    "tabs",
    "storage",
    "scripting"
  ],
  
  "host_permissions": [
    "<all_urls>"
  ],
  
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  
  "background": {
    "service_worker": "background.js"
  },
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-script.js"],
      "run_at": "document_start",
      "all_frames": false,
      "match_about_blank": false
    }
  ],
  
  "web_accessible_resources": [
    {
      "resources": ["vivaldi-bridge.js"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

---

## Implementation: Content Script (Injector)

**content-script.js** - Injects the bridge into Vivaldi's page context:

```javascript
// content-script.js
// This runs in Vivaldi's content script context
// It can inject scripts into the page context where vivaldi.* APIs are available

(function() {
  'use strict';
  
  // Only inject in Vivaldi browser
  if (!navigator.userAgent.includes('Vivaldi')) {
    return;
  }
  
  // Check if we're in the right context (Vivaldi's UI pages)
  const isVivaldiUI = window.location.href.startsWith('chrome-extension://') ||
                      window.location.href.startsWith('vivaldi://');
  
  if (!isVivaldiUI) {
    return;
  }
  
  console.log('[Content Script] Injecting Vivaldi bridge...');
  
  // Inject the bridge script into the page context
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('vivaldi-bridge.js');
  script.onload = function() {
    console.log('[Content Script] Vivaldi bridge injected successfully');
    this.remove();
  };
  
  (document.head || document.documentElement).appendChild(script);
  
  // Set up message relay between page and extension
  window.addEventListener('message', function(event) {
    // Only accept messages from the same origin
    if (event.source !== window) return;
    
    if (event.data.type && event.data.type === 'VIVALDI_BRIDGE_TO_EXTENSION') {
      // Relay to extension background script
      chrome.runtime.sendMessage(event.data.payload);
    }
  });
  
  // Listen for messages from extension and relay to page
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXTENSION_TO_VIVALDI_BRIDGE') {
      window.postMessage({
        type: 'EXTENSION_TO_VIVALDI_BRIDGE',
        payload: message.payload
      }, '*');
    }
  });
  
})();
```

---

## Implementation: Vivaldi Bridge (Injected)

**vivaldi-bridge.js** - Runs in page context with access to `vivaldi.*` APIs:

```javascript
// vivaldi-bridge.js
// This runs in the PAGE CONTEXT where vivaldi.* APIs are available

(function() {
  'use strict';
  
  console.log('[Vivaldi Bridge] Loading...');
  
  // Check if Vivaldi APIs are available
  if (typeof vivaldi === 'undefined') {
    console.warn('[Vivaldi Bridge] Vivaldi APIs not available in this context');
    return;
  }
  
  if (!vivaldi.workspaces) {
    console.warn('[Vivaldi Bridge] Vivaldi Workspaces API not available');
    return;
  }
  
  console.log('[Vivaldi Bridge] Vivaldi APIs detected!');
  
  // Notify that bridge is ready
  notifyBridgeReady();
  
  // Listen for commands from the extension (via content script relay)
  window.addEventListener('message', async function(event) {
    if (event.source !== window) return;
    
    if (event.data.type === 'EXTENSION_TO_VIVALDI_BRIDGE') {
      const command = event.data.payload;
      await handleCommand(command);
    }
  });
  
  // Also listen via chrome.storage for fallback
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
      if (namespace !== 'local') return;
      
      if (changes.vivaldiCommand && changes.vivaldiCommand.newValue) {
        const command = changes.vivaldiCommand.newValue;
        await handleCommand(command);
      }
    });
  }
  
  function notifyBridgeReady() {
    // Notify via postMessage
    window.postMessage({
      type: 'VIVALDI_BRIDGE_TO_EXTENSION',
      payload: {
        action: 'bridge_ready',
        timestamp: Date.now()
      }
    }, '*');
    
    // Also notify via storage for fallback
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        vivaldiApiAvailable: true,
        vivaldiApiVersion: '1.0',
        timestamp: Date.now()
      });
    }
  }
  
  async function handleCommand(command) {
    console.log('[Vivaldi Bridge] Received command:', command);
    
    try {
      let result;
      
      switch (command.action) {
        case 'test':
          result = { success: true, message: 'Bridge is working!' };
          break;
          
        case 'organize_workspaces':
          result = await organizeToWorkspaces(command.categorizedTabs);
          break;
          
        case 'get_workspaces':
          result = await getWorkspaces();
          break;
          
        case 'create_workspace':
          result = await createWorkspace(command.name);
          break;
          
        default:
          result = { success: false, error: 'Unknown command' };
      }
      
      // Send result back
      sendResult(result);
      
    } catch (error) {
      console.error('[Vivaldi Bridge] Error handling command:', error);
      sendResult({ success: false, error: error.message });
    }
  }
  
  function sendResult(result) {
    // Send via postMessage
    window.postMessage({
      type: 'VIVALDI_BRIDGE_TO_EXTENSION',
      payload: {
        action: 'command_result',
        result: result,
        timestamp: Date.now()
      }
    }, '*');
    
    // Also send via storage for fallback
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        vivaldiCommandResult: {
          ...result,
          timestamp: Date.now()
        }
      });
    }
  }
  
  async function getWorkspaces() {
    return new Promise((resolve) => {
      vivaldi.workspaces.getAll((workspaces) => {
        resolve({
          success: true,
          workspaces: workspaces || []
        });
      });
    });
  }
  
  async function createWorkspace(name) {
    return new Promise((resolve, reject) => {
      vivaldi.workspaces.create({ title: name }, (workspace) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (workspace && workspace.id) {
          resolve({
            success: true,
            workspace: workspace
          });
        } else {
          reject(new Error('Failed to create workspace'));
        }
      });
    });
  }
  
  async function organizeToWorkspaces(categorizedTabs) {
    console.log('[Vivaldi Bridge] Organizing tabs to workspaces...');
    
    // Get existing workspaces
    const workspaces = await new Promise(resolve => {
      vivaldi.workspaces.getAll(resolve);
    });
    
    const workspaceMap = new Map();
    workspaces.forEach(ws => {
      workspaceMap.set(ws.title, ws.id);
    });
    
    let created = 0;
    let moved = 0;
    
    // Process each category
    for (const [category, tabs] of Object.entries(categorizedTabs)) {
      if (tabs.length === 0 || category === 'Uncategorized') continue;
      
      let workspaceId;
      
      // Check if workspace exists
      if (workspaceMap.has(category)) {
        workspaceId = workspaceMap.get(category);
      } else {
        // Create new workspace
        const result = await createWorkspace(category);
        workspaceId = result.workspace.id;
        workspaceMap.set(category, workspaceId);
        created++;
      }
      
      // Move tabs to workspace
      for (const tab of tabs) {
        try {
          await new Promise((resolve) => {
            // Try vivaldi.workspaces.addTab first
            if (vivaldi.workspaces.addTab) {
              vivaldi.workspaces.addTab(workspaceId, tab.id, () => {
                moved++;
                resolve();
              });
            } 
            // Fallback to vivaldi.tabsPrivate.setWorkspace
            else if (vivaldi.tabsPrivate && vivaldi.tabsPrivate.setWorkspace) {
              vivaldi.tabsPrivate.setWorkspace(tab.id, workspaceId, () => {
                moved++;
                resolve();
              });
            } else {
              console.warn('No Vivaldi API available to move tabs');
              resolve();
            }
          });
        } catch (error) {
          console.warn(`Failed to move tab ${tab.id}:`, error);
        }
      }
    }
    
    return {
      success: true,
      workspacesCreated: created,
      tabsMoved: moved,
      message: `Created ${created} workspaces and moved ${moved} tabs`
    };
  }
  
  console.log('[Vivaldi Bridge] Ready and listening for commands');
  
})();
```

---

## Implementation: Background Script (Updated)

**background.js** - Communicates with the bridge:

```javascript
// background.js
// Service worker that coordinates between popup and Vivaldi bridge

// Track if Vivaldi API is available
let vivaldiApiAvailable = false;

// Check on startup
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Background] Extension installed');
  await checkVivaldiAPI();
});

chrome.runtime.onStartup.addListener(async () => {
  await checkVivaldiAPI();
});

async function checkVivaldiAPI() {
  try {
    const result = await chrome.storage.local.get('vivaldiApiAvailable');
    vivaldiApiAvailable = result.vivaldiApiAvailable || false;
    console.log('[Background] Vivaldi API available:', vivaldiApiAvailable);
  } catch (error) {
    console.error('[Background] Error checking Vivaldi API:', error);
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'organizeToWorkspaces') {
    handleWorkspaceOrganization(request.categorizedTabs)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Async response
  }
  
  if (request.action === 'checkVivaldiAPI') {
    checkVivaldiAPI()
      .then(() => sendResponse({ available: vivaldiApiAvailable }))
      .catch(error => sendResponse({ available: false, error: error.message }));
    return true;
  }
});

async function handleWorkspaceOrganization(categorizedTabs) {
  console.log('[Background] Organizing tabs to workspaces...');
  
  // Send command to Vivaldi bridge via storage
  await chrome.storage.local.set({
    vivaldiCommand: {
      action: 'organize_workspaces',
      categorizedTabs: categorizedTabs,
      timestamp: Date.now()
    }
  });
  
  // Wait for result
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for Vivaldi bridge response'));
    }, 5000);
    
    const checkResult = async () => {
      const result = await chrome.storage.local.get('vivaldiCommandResult');
      
      if (result.vivaldiCommandResult && 
          result.vivaldiCommandResult.timestamp > Date.now() - 6000) {
        clearTimeout(timeout);
        
        // Clear command and result
        await chrome.storage.local.remove(['vivaldiCommand', 'vivaldiCommandResult']);
        
        if (result.vivaldiCommandResult.success) {
          resolve(result.vivaldiCommandResult);
        } else {
          reject(new Error(result.vivaldiCommandResult.error || 'Operation failed'));
        }
      } else {
        // Check again in 500ms
        setTimeout(checkResult, 500);
      }
    };
    
    checkResult();
  });
}
```

---

## Benefits of This Approach

### ✅ User Experience
- **Single installation**: Just load the extension
- **No manual file editing**: Everything is automatic
- **Works immediately**: Bridge auto-injects when needed
- **Standard Chrome extension**: Users know how to install it

### ✅ Developer Experience
- **All code in one place**: Extension contains everything
- **Easier updates**: Update extension, not system files
- **Better testing**: Can test the whole package
- **Version control**: Everything tracked in git

### ✅ Technical
- **Full Vivaldi API access**: Via injected bridge
- **Fallback mechanisms**: Multiple communication methods
- **Standard Chrome APIs**: For basic functionality
- **Graceful degradation**: Works in Chrome (without Vivaldi features)

---

## Limitations

### ⚠️ Still Has Some Constraints

1. **Content Script Injection Context**
   - Content scripts may not run on all Vivaldi internal pages
   - Some Vivaldi pages may block script injection
   - Need to target the right pages

2. **API Availability**
   - `vivaldi.*` APIs only available in specific contexts
   - May not work on all tabs/pages
   - Need to detect and handle gracefully

3. **Security Restrictions**
   - Chrome's Content Security Policy may block injection
   - Some Vivaldi pages may have strict CSP
   - Need to use `web_accessible_resources`

---

## How This Is Better Than Current Approach

| Feature | Current (Manual Bridge) | New (Auto-Injecting Extension) |
|---------|------------------------|-------------------------------|
| Installation | Load extension + edit window.html | ✅ Just load extension |
| Updates | Update extension + re-edit file | ✅ Just update extension |
| Breaks on Vivaldi update | ✅ Yes | ⚠️ Might (less likely) |
| User complexity | High | ✅ Low |
| Vivaldi API access | ✅ Full | ✅ Full |
| Distribution | Needs manual instructions | ✅ Can zip and share |
| Maintenance | Hard | ✅ Easier |

---

## Implementation Status

This approach requires:

1. ✅ Update manifest.json (add content_scripts, web_accessible_resources)
2. ✅ Create content-script.js (injector)
3. ✅ Update vivaldi-bridge.js (make it injectable)
4. ✅ Update background.js (handle bridge communication)
5. ⚠️ Test on actual Vivaldi browser
6. ⚠️ Handle edge cases where injection fails

---

## Conclusion

**Yes! You can make a Chrome extension that utilizes Vivaldi API inside it!**

The key is:
1. **Chrome extension** provides the UI and core logic
2. **Content script** injects bridge into page context  
3. **Injected bridge** accesses `vivaldi.*` APIs
4. **Communication** happens via postMessage and storage
5. **User sees** a single extension that just works

This is **much better than the current manual bridge approach** because:
- ✅ No manual file editing required
- ✅ Easier installation and updates
- ✅ Self-contained package
- ✅ Standard Chrome extension distribution

Would you like me to implement this improved architecture?
