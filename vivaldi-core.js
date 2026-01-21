// vivaldi-core.js - Vivaldi API Integration (Auto-Injected)
// This script runs in the PAGE CONTEXT where vivaldi.* APIs are available
// It is automatically injected by vivaldi-inject.js content script
//
// This provides full access to Vivaldi's native APIs for the extension

(function() {
  'use strict';
  
  console.log('[Vivaldi Core] Loading...');
  
  // Check if Vivaldi APIs are available
  const hasVivaldiAPI = typeof vivaldi !== 'undefined';
  const hasWorkspaces = hasVivaldiAPI && vivaldi.workspaces;
  const hasTabsPrivate = hasVivaldiAPI && vivaldi.tabsPrivate;
  
  console.log('[Vivaldi Core] API Status:', {
    hasVivaldiAPI,
    hasWorkspaces,
    hasTabsPrivate
  });
  
  if (!hasVivaldiAPI) {
    console.warn('[Vivaldi Core] Vivaldi APIs not available in this context');
    notifyStatus({ available: false, reason: 'No Vivaldi API' });
    return;
  }
  
  if (!hasWorkspaces) {
    console.warn('[Vivaldi Core] Vivaldi Workspaces API not available');
    notifyStatus({ available: false, reason: 'No Workspaces API' });
    return;
  }
  
  console.log('[Vivaldi Core] Vivaldi APIs detected and ready!');
  
  // Notify extension that Vivaldi APIs are available
  notifyStatus({ available: true, apis: { workspaces: hasWorkspaces, tabsPrivate: hasTabsPrivate } });
  
  // Listen for commands via window.postMessage (from vivaldi-inject.js)
  window.addEventListener('message', async function(event) {
    if (event.source !== window) return;
    
    if (event.data.type === 'EXTENSION_TO_VIVALDI') {
      const command = event.data.payload;
      await handleCommand(command);
    }
  });
  
  // Also listen via chrome.storage for fallback compatibility with existing code
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
      if (namespace !== 'local') return;
      
      if (changes.workspaceCommand && changes.workspaceCommand.newValue) {
        const command = changes.workspaceCommand.newValue;
        console.log('[Vivaldi Core] Received command via storage:', command);
        await handleCommand(command);
      }
    });
  }
  
  function notifyStatus(status) {
    // Notify via postMessage
    window.postMessage({
      type: 'VIVALDI_TO_EXTENSION',
      payload: {
        action: 'status',
        ...status,
        timestamp: Date.now()
      }
    }, '*');
    
    // Also notify via storage for fallback
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        vivaldiApiStatus: {
          ...status,
          timestamp: Date.now()
        }
      }).catch(err => console.error('[Vivaldi Core] Error setting status:', err));
    }
  }
  
  async function handleCommand(command) {
    console.log('[Vivaldi Core] Handling command:', command.action);
    
    try {
      let result;
      
      switch (command.action) {
        case 'test':
          result = { success: true, message: 'Vivaldi Core is responding', apis: { workspaces: hasWorkspaces, tabsPrivate: hasTabsPrivate } };
          break;
          
        case 'organize':
          result = await organizeTabsToWorkspaces(command.categorizedTabs);
          break;
          
        case 'getWorkspaces':
          result = await getWorkspaces();
          break;
          
        case 'createWorkspace':
          result = await createWorkspaceCommand(command.name);
          break;
          
        case 'diagnostics':
          result = await runDiagnostics();
          break;
          
        default:
          result = { success: false, error: `Unknown command: ${command.action}` };
      }
      
      // Send result back
      sendResult(result);
      
    } catch (error) {
      console.error('[Vivaldi Core] Error handling command:', error);
      sendResult({ success: false, error: error.message });
    }
  }
  
  function sendResult(result) {
    // Send via postMessage
    window.postMessage({
      type: 'VIVALDI_TO_EXTENSION',
      payload: {
        action: 'command_result',
        result: result,
        timestamp: Date.now()
      }
    }, '*');
    
    // Also send via storage for fallback (for backward compatibility)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        workspaceCommandResult: {
          ...result,
          timestamp: Date.now()
        }
      }).catch(err => console.error('[Vivaldi Core] Error sending result:', err));
    }
  }
  
  async function runDiagnostics() {
    const diagnostics = {
      vivaldiDetected: typeof vivaldi !== 'undefined',
      apis: {},
      workspaces: [],
      tabsCount: 0
    };
    
    if (typeof vivaldi !== 'undefined') {
      diagnostics.apis.workspaces = !!vivaldi.workspaces;
      diagnostics.apis.tabsPrivate = !!vivaldi.tabsPrivate;
      diagnostics.apis.utilities = !!vivaldi.utilities;
      diagnostics.apis.notes = !!vivaldi.notes;
      
      if (vivaldi.workspaces) {
        try {
          const workspaces = await new Promise(resolve => vivaldi.workspaces.getAll(resolve));
          diagnostics.workspaces = workspaces || [];
        } catch (err) {
          diagnostics.workspacesError = err.message;
        }
      }
      
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        try {
          const tabs = await chrome.tabs.query({});
          diagnostics.tabsCount = tabs.length;
        } catch (err) {
          diagnostics.tabsError = err.message;
        }
      }
    }
    
    return { success: true, diagnostics };
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
          resolve(workspace.id);  // Return just the ID for organizeTabsToWorkspaces
        } else {
          reject(new Error('Failed to create workspace'));
        }
      });
    });
  }
  
  // Wrapper for command handler that returns full object
  async function createWorkspaceCommand(name) {
    const workspaceId = await createWorkspace(name);
    return {
      success: true,
      workspace: { id: workspaceId, title: name }
    };
  }
  
  async function organizeTabsToWorkspaces(categorizedTabs) {
    try {
      // Get all existing workspaces
      const workspaces = await new Promise((resolve) => {
        vivaldi.workspaces.getAll((workspaces) => {
          resolve(workspaces || []);
        });
      });
      
      console.log('Existing workspaces:', workspaces);
      
      // Create a map of workspace names to IDs
      const workspaceMap = new Map();
      workspaces.forEach(ws => {
        workspaceMap.set(ws.title, ws.id);
      });
      
      // Process each category
      for (const [category, tabs] of Object.entries(categorizedTabs)) {
        if (tabs.length === 0) continue;
        if (category === 'Uncategorized') continue;
        
        let workspaceId;
        
        // Check if workspace exists
        if (workspaceMap.has(category)) {
          workspaceId = workspaceMap.get(category);
          console.log(`Using existing workspace: ${category} (ID: ${workspaceId})`);
        } else {
          // Create new workspace
          workspaceId = await createWorkspace(category);
          console.log(`Created new workspace: ${category} (ID: ${workspaceId})`);
          workspaceMap.set(category, workspaceId);
        }
        
        // Move tabs to the workspace
        const tabIds = tabs.map(t => t.id);
        await moveTabsToWorkspace(tabIds, workspaceId);
      }
      
      console.log('Successfully organized tabs into workspaces');
      
    } catch (error) {
      console.error('Error organizing tabs to workspaces:', error);
      throw error;
    }
  }
  
  function moveTabsToWorkspace(tabIds, workspaceId) {
    return new Promise((resolve, reject) => {
      try {
        // Move tabs one by one to avoid issues
        // Note: The exact API method may vary by Vivaldi version
        // This implementation uses vivaldi.workspaces.addTab
        // Alternative: vivaldi.tabsPrivate.setWorkspace (see below)
        let moved = 0;
        
        const moveNext = () => {
          if (moved >= tabIds.length) {
            resolve();
            return;
          }
          
          const tabId = tabIds[moved];
          
          vivaldi.workspaces.addTab(workspaceId, tabId, (result) => {
            if (chrome.runtime.lastError) {
              console.warn(`Warning moving tab ${tabId}:`, chrome.runtime.lastError.message);
            }
            moved++;
            moveNext();
          });
        };
        
        moveNext();
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // Alternative method: Use vivaldi.tabsPrivate if available
  async function moveTabsToWorkspaceAlternative(tabIds, workspaceId) {
    if (typeof vivaldi.tabsPrivate !== 'undefined' && vivaldi.tabsPrivate.setWorkspace) {
      for (const tabId of tabIds) {
        try {
          await new Promise((resolve, reject) => {
            vivaldi.tabsPrivate.setWorkspace(tabId, workspaceId, () => {
              if (chrome.runtime.lastError) {
                console.warn(`Warning setting workspace for tab ${tabId}:`, chrome.runtime.lastError.message);
              }
              resolve();
            });
          });
        } catch (error) {
          console.warn(`Error setting workspace for tab ${tabId}:`, error);
        }
      }
    } else {
      // Fallback to standard method
      return moveTabsToWorkspace(tabIds, workspaceId);
    }
  }
  
  console.log('Vivaldi AI Tab Sorter Bridge Script ready');
  
})();
