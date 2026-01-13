// Background Service Worker for Vivaldi AI Tab Sorter

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'organizeToWorkspaces') {
    handleWorkspaceOrganization(request.categorizedTabs)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
});

async function handleWorkspaceOrganization(categorizedTabs) {
  try {
    console.log('Starting workspace organization via Chrome Extensions API...');
    
    // First, try the new Chrome Extensions API approach (works without bridge)
    try {
      return await organizeViaExtensionsAPI(categorizedTabs);
    } catch (apiError) {
      console.log('Extensions API approach failed, trying bridge fallback:', apiError.message);
      
      // Fallback to bridge communication method
      return await organizeViaBridge(categorizedTabs);
    }
    
  } catch (error) {
    console.error('Error in workspace organization:', error);
    throw error;
  }
}

// New approach: Use Chrome Extensions API directly (no bridge required)
async function organizeViaExtensionsAPI(categorizedTabs) {
  console.log('Using Chrome Extensions API for workspace organization...');
  
  // Get all current windows to manage workspaces
  const windows = await chrome.windows.getAll({ populate: true });
  // Get the last focused normal window instead of getCurrent() which doesn't work in service worker context
  const currentWindow = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
  
  // Vivaldi supports creating windows with specific properties that act as workspaces
  // We'll create a separate window for each category
  
  const createdWindows = [];
  
  for (const [category, tabs] of Object.entries(categorizedTabs)) {
    if (tabs.length === 0) continue;
    
    console.log(`Creating workspace window for category: ${category} with ${tabs.length} tabs`);
    
    // Get the first tab to open in the new window
    const firstTab = tabs[0];
    
    // Create a new window with the first tab
    const newWindow = await chrome.windows.create({
      url: firstTab.url,
      focused: false,
      type: 'normal',
      // Vivaldi-specific: Set window title/name if available
      // This helps identify the workspace
      state: 'normal'
    });
    
    console.log(`Created window ${newWindow.id} for category: ${category}`);
    createdWindows.push({ windowId: newWindow.id, category: category });
    
    // Move remaining tabs to the new window
    if (tabs.length > 1) {
      const remainingTabIds = tabs.slice(1).map(t => t.id);
      
      try {
        await chrome.tabs.move(remainingTabIds, {
          windowId: newWindow.id,
          index: -1  // Append to end
        });
        console.log(`Moved ${remainingTabIds.length} additional tabs to window ${newWindow.id}`);
      } catch (moveError) {
        console.error(`Error moving tabs to window ${newWindow.id}:`, moveError);
      }
    }
    
    // Close the duplicate tab that was created (if the original tab still exists)
    if (newWindow.tabs && newWindow.tabs.length > 0) {
      const newTabId = newWindow.tabs[0].id;
      // Only close if we're moving existing tabs
      if (tabs.length > 1 && firstTab.id !== newTabId) {
        try {
          await chrome.tabs.remove(newTabId);
        } catch (e) {
          // Ignore errors closing the duplicate tab
        }
      }
    }
  }
  
  console.log(`Successfully created ${createdWindows.length} workspace windows`);
  
  if (createdWindows.length === 0) {
    throw new Error('No workspace windows were created. Please ensure you have categorized tabs and try again.');
  }
  
  // Focus back on original window if it still exists
  try {
    await chrome.windows.update(currentWindow.id, { focused: true });
  } catch (e) {
    // Original window might have been closed
  }
  
  return {
    success: true,
    method: 'extensionsAPI',
    windowsCreated: createdWindows.length,
    message: `Created ${createdWindows.length} workspace windows. Each category has its own window acting as a workspace.`
  };
}

// Fallback: Bridge communication method (requires ai_bridge.js in window.html)
async function organizeViaBridge(categorizedTabs) {
  console.log('Attempting to communicate with Vivaldi bridge script...');
  
  // First, try to send message to the bridge via storage
  await chrome.storage.local.set({
    workspaceCommand: {
      action: 'organize',
      categorizedTabs: categorizedTabs,
      timestamp: Date.now()
    }
  });
  
  console.log('Workspace command sent to storage, waiting for bridge response...');
  
  // Wait for the bridge to process (increased from 1s to 2s for reliability)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check if the bridge responded
  const result = await chrome.storage.local.get('workspaceCommandResult');
  
  if (result.workspaceCommandResult && 
      result.workspaceCommandResult.timestamp > Date.now() - 5000) {
    console.log('Bridge responded:', result.workspaceCommandResult);
    
    // Clear the command and result
    await chrome.storage.local.remove(['workspaceCommand', 'workspaceCommandResult']);
    
    if (result.workspaceCommandResult.success) {
      return { success: true, method: 'bridge' };
    } else {
      throw new Error(result.workspaceCommandResult.error || 'Workspace operation failed');
    }
  }
  
  // If no response from bridge, throw error
  console.error('No response from Vivaldi bridge script');
  throw new Error('Vivaldi bridge script not responding. Using fallback method instead.');
}

// Monitor storage changes for bridge communication
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.workspaceCommandResult) {
    console.log('Workspace command result received:', changes.workspaceCommandResult.newValue);
  }
});

// Installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Vivaldi AI Tab Sorter installed!');
    // Extension installed successfully - users can access documentation from the extension folder
  }
});
