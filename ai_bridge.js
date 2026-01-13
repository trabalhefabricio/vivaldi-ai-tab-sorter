// ai_bridge.js - Vivaldi Workspace Bridge Script
// This script must be injected into Vivaldi's window.html to access vivaldi.workspaces API
// 
// Installation:
// 1. Close Vivaldi completely
// 2. Navigate to Vivaldi's application folder:
//    - Windows: C:\Users\[YourUsername]\AppData\Local\Vivaldi\Application\[version]\resources\vivaldi
//    - macOS: /Applications/Vivaldi.app/Contents/Versions/[version]/Vivaldi Framework.framework/Resources/vivaldi
//    - Linux: /opt/vivaldi/resources/vivaldi
// 3. Open window.html in a text editor
// 4. Add this line before the closing </body> tag:
//    <script src="ai_bridge.js"></script>
// 5. Copy this ai_bridge.js file to the same directory
// 6. Restart Vivaldi

(function() {
  'use strict';
  
  console.log('Vivaldi AI Tab Sorter Bridge Script loaded');
  
  // Check if we have access to vivaldi.workspaces API
  if (typeof vivaldi === 'undefined' || !vivaldi.workspaces) {
    console.error('Vivaldi workspaces API not available');
    return;
  }
  
  // Listen for commands from the extension via storage
  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace !== 'local') return;
    
    if (changes.workspaceCommand && changes.workspaceCommand.newValue) {
      const command = changes.workspaceCommand.newValue;
      console.log('Received workspace command:', command);
      
      try {
        if (command.action === 'test') {
          // Simple test response to verify bridge is loaded
          console.log('Bridge test request received, responding...');
          await chrome.storage.local.set({
            workspaceCommandResult: {
              success: true,
              message: 'Bridge is responding',
              timestamp: Date.now()
            }
          });
        } else if (command.action === 'organize') {
          await organizeTabsToWorkspaces(command.categorizedTabs);
          
          // Send success response
          await chrome.storage.local.set({
            workspaceCommandResult: {
              success: true,
              timestamp: Date.now()
            }
          });
        }
      } catch (error) {
        console.error('Error processing workspace command:', error);
        
        // Send error response
        await chrome.storage.local.set({
          workspaceCommandResult: {
            success: false,
            error: error.message,
            timestamp: Date.now()
          }
        });
      }
    }
    
    // Handle tab stacking commands
    if (changes.tabStackCommand && changes.tabStackCommand.newValue) {
      const command = changes.tabStackCommand.newValue;
      console.log('Received tab stack command:', command);
      
      try {
        if (command.action === 'createStacks') {
          const stacksCreated = await createTabStacks(command.categorizedTabs, command.targetWindowId);
          
          // Send success response
          await chrome.storage.local.set({
            tabStackCommandResult: {
              success: true,
              stacksCreated: stacksCreated,
              timestamp: Date.now()
            }
          });
        }
      } catch (error) {
        console.error('Error processing tab stack command:', error);
        
        // Send error response
        await chrome.storage.local.set({
          tabStackCommandResult: {
            success: false,
            error: error.message,
            timestamp: Date.now()
          }
        });
      }
    }
  });
  
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
  
  function createWorkspace(name) {
    return new Promise((resolve, reject) => {
      try {
        vivaldi.workspaces.create({ title: name }, (workspace) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (workspace && workspace.id) {
            resolve(workspace.id);
          } else {
            reject(new Error('Failed to create workspace'));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
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
  
  // Create Tab Stacks using Vivaldi's tabsPrivate API
  async function createTabStacks(categorizedTabs, targetWindowId) {
    try {
      console.log('Creating tab stacks with Vivaldi tabsPrivate API...');
      
      if (typeof vivaldi === 'undefined' || !vivaldi.tabsPrivate) {
        throw new Error('Vivaldi tabsPrivate API not available');
      }
      
      let stacksCreated = 0;
      const stackColors = ['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
      
      // Get all tabs organized by category
      const categories = Object.entries(categorizedTabs).filter(([cat, tabs]) => tabs.length > 0);
      
      for (let i = 0; i < categories.length; i++) {
        const [category, tabs] = categories[i];
        
        if (tabs.length === 0) continue;
        if (category === 'Uncategorized') continue;
        
        console.log(`Creating stack for "${category}" with ${tabs.length} tabs`);
        
        // Filter to only tabs in target window if specified
        let tabsToStack = tabs;
        if (targetWindowId) {
          tabsToStack = tabs.filter(t => t.windowId === targetWindowId);
        }
        
        if (tabsToStack.length === 0) {
          console.log(`No tabs in target window for "${category}", skipping`);
          continue;
        }
        
        if (tabsToStack.length === 1) {
          console.log(`Only one tab for "${category}", no stack needed`);
          stacksCreated++;
          continue;
        }
        
        const parentTabId = tabsToStack[0].id;
        console.log(`Using tab ${parentTabId} as parent for stack`);
        
        // Add remaining tabs to the parent's stack
        for (let j = 1; j < tabsToStack.length; j++) {
          const childTabId = tabsToStack[j].id;
          
          await new Promise((resolve) => {
            vivaldi.tabsPrivate.insertIntoTabStack(childTabId, parentTabId, () => {
              if (chrome.runtime.lastError) {
                console.warn(`Warning adding tab ${childTabId} to stack:`, chrome.runtime.lastError.message);
              } else {
                console.log(`Added tab ${childTabId} to stack under parent ${parentTabId}`);
              }
              resolve();
            });
          });
        }
        
        // Set color and name on the parent tab
        const stackColor = stackColors[i % stackColors.length];
        
        // Set stack color
        if (vivaldi.tabsPrivate.update) {
          await new Promise((resolve) => {
            vivaldi.tabsPrivate.update(parentTabId, { stackColor: stackColor }, () => {
              if (chrome.runtime.lastError) {
                console.warn(`Warning setting stack color:`, chrome.runtime.lastError.message);
              } else {
                console.log(`Set stack color to ${stackColor}`);
              }
              resolve();
            });
          });
          
          // Set stack name
          await new Promise((resolve) => {
            vivaldi.tabsPrivate.update(parentTabId, { stackName: category }, () => {
              if (chrome.runtime.lastError) {
                console.warn(`Warning setting stack name:`, chrome.runtime.lastError.message);
              } else {
                console.log(`Set stack name to "${category}"`);
              }
              resolve();
            });
          });
        }
        
        console.log(`Created stack for "${category}" with ${tabsToStack.length} tabs, color: ${stackColor}`);
        stacksCreated++;
      }
      
      console.log(`Successfully created ${stacksCreated} tab stacks`);
      return stacksCreated;
      
    } catch (error) {
      console.error('Error creating tab stacks:', error);
      throw error;
    }
  }
  
  console.log('Vivaldi AI Tab Sorter Bridge Script ready');
  
})();
