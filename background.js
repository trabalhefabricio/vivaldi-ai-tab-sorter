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
    // Try to communicate with the Vivaldi bridge script
    // The bridge script should be injected into Vivaldi's browser.html
    
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
        return { success: true };
      } else {
        throw new Error(result.workspaceCommandResult.error || 'Workspace operation failed');
      }
    }
    
    // If no response from bridge, it might not be installed
    console.error('No response from Vivaldi bridge script');
    throw new Error('Vivaldi bridge script not responding. Please ensure ai_bridge.js is properly installed in browser.html');
    
  } catch (error) {
    console.error('Error in workspace organization:', error);
    throw error;
  }
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
