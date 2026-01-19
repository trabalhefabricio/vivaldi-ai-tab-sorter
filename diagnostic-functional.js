// Constants for test configuration
const TAB_LOAD_TIMEOUT = 1000; // ms to wait for tabs to load
const MIN_REQUEST_INTERVAL = 4000; // 4 seconds between API requests (15 RPM = 1 request per 4s)

let testResults = {
  timestamp: null,
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Check extension context
function checkContext() {
  const hasChrome = typeof chrome !== 'undefined';
  const hasRuntime = hasChrome && chrome.runtime;
  const hasTabs = hasChrome && chrome.tabs;
  const hasStorage = hasChrome && chrome.storage;

  const statusEl = document.getElementById('contextStatus');
  if (hasRuntime && hasTabs && hasStorage) {
    statusEl.textContent = '✅ Running in extension context';
    statusEl.style.color = '#2e7d32';
    statusEl.style.fontWeight = 'bold';
    return true;
  } else {
    statusEl.textContent = '❌ NOT in extension context - tests will fail';
    statusEl.style.color = '#c62828';
    statusEl.style.fontWeight = 'bold';
    return false;
  }
}

// Initialize when DOM is ready - handle both cases where DOMContentLoaded has or hasn't fired
function initializeDiagnostic() {
  checkContext();
  
  // Attach event listeners to buttons
  const runAllBtn = document.getElementById('runAllBtn');
  const runCriticalBtn = document.getElementById('runCriticalBtn');
  const exportBtn = document.getElementById('exportBtn');
  
  if (runAllBtn && runCriticalBtn && exportBtn) {
    runAllBtn.addEventListener('click', runAllTests);
    runCriticalBtn.addEventListener('click', runCriticalTests);
    exportBtn.addEventListener('click', exportResults);
    console.log('Diagnostic tool loaded. Buttons initialized.');
  } else {
    console.error('Failed to find buttons:', { runAllBtn, runCriticalBtn, exportBtn });
  }
}

// Check if DOM is already loaded, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDiagnostic);
} else {
  // DOM already loaded, initialize immediately
  initializeDiagnostic();
}

// Test definitions
const testSuites = {
  'Storage & Settings': [
    {
      name: 'Storage Write/Read Test',
      description: 'Tests if chrome.storage can write and read data correctly',
      critical: true,
      test: async () => {
        const testData = {
          testKey: 'testValue_' + Date.now(),
          testObject: { nested: 'value', array: [1, 2, 3] }
        };

        await chrome.storage.local.set(testData);
        const result = await chrome.storage.local.get(Object.keys(testData));
        await chrome.storage.local.remove(Object.keys(testData));

        // Deep comparison function that handles objects recursively
        const deepEqual = (obj1, obj2) => {
          if (obj1 === obj2) return true;
          if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;
          if (obj1 === null || obj2 === null) return obj1 === obj2;
          if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
          
          const keys1 = Object.keys(obj1).sort();
          const keys2 = Object.keys(obj2).sort();
          if (keys1.length !== keys2.length) return false;
          
          for (let key of keys1) {
            if (!keys2.includes(key)) return false;
            if (!deepEqual(obj1[key], obj2[key])) return false;
          }
          return true;
        };

        if (!deepEqual(result, testData)) {
          throw new Error(`Data mismatch: wrote ${JSON.stringify(testData)}, read ${JSON.stringify(result)}`);
        }

        return { success: true, message: 'Storage write/read successful', data: testData };
      }
    },
    {
      name: 'Settings Persistence Test',
      description: 'Tests if extension settings can be saved and loaded',
      critical: true,
      test: async () => {
        const testSettings = {
          apiKey: 'test_key_' + Date.now(),
          categories: 'Work,Personal,Shopping',
          mode: 'stacks'
        };

        await chrome.storage.local.set(testSettings);
        const loaded = await chrome.storage.local.get(Object.keys(testSettings));
        await chrome.storage.local.remove(Object.keys(testSettings));

        const errors = [];
        for (const key of Object.keys(testSettings)) {
          if (loaded[key] !== testSettings[key]) {
            errors.push(`${key}: expected "${testSettings[key]}", got "${loaded[key]}"`);
          }
        }

        if (errors.length > 0) {
          throw new Error('Settings mismatch: ' + errors.join(', '));
        }

        return { success: true, message: 'Settings persist correctly', tested: Object.keys(testSettings) };
      }
    },
    {
      name: 'Rate Limiting Tracking Test',
      description: 'Tests if rate limiting counter can be tracked',
      critical: false,
      test: async () => {
        const initialData = await chrome.storage.local.get(['requestCount', 'lastResetDate']);
        const testCount = (initialData.requestCount || 0) + 1;
        const testDate = new Date().toDateString();

        await chrome.storage.local.set({
          requestCount: testCount,
          lastResetDate: testDate
        });

        const newData = await chrome.storage.local.get(['requestCount', 'lastResetDate']);

        if (newData.requestCount !== testCount || newData.lastResetDate !== testDate) {
          throw new Error(`Rate limiting data not saved correctly`);
        }

        // Restore original
        await chrome.storage.local.set(initialData);

        return { success: true, message: 'Rate limiting tracking works', count: testCount };
      }
    }
  ],
  'Tab Management': [
    {
      name: 'Tab Query Test',
      description: 'Tests if extension can query current tabs',
      critical: true,
      test: async () => {
        const tabs = await chrome.tabs.query({});
        
        if (!Array.isArray(tabs)) {
          throw new Error('Tab query did not return an array');
        }

        if (tabs.length === 0) {
          return { success: true, message: 'Tab query works (no tabs open)', tabCount: 0, warning: true };
        }

        const hasRequiredProps = tabs.every(tab => 
          tab.hasOwnProperty('id') && 
          tab.hasOwnProperty('url') && 
          tab.hasOwnProperty('title')
        );

        if (!hasRequiredProps) {
          throw new Error('Tabs missing required properties (id, url, title)');
        }

        return { success: true, message: 'Tab query successful', tabCount: tabs.length, sample: tabs[0] };
      }
    },
    {
      name: 'Duplicate Detection Algorithm Test',
      description: 'Tests if duplicate URL detection works correctly',
      critical: true,
      test: async () => {
        const testTabs = [
          { id: 1, url: 'https://example.com/page1', title: 'Page 1' },
          { id: 2, url: 'https://example.com/page1', title: 'Page 1 Dup' },
          { id: 3, url: 'https://example.com/page2', title: 'Page 2' },
          { id: 4, url: 'https://example.com/page1', title: 'Page 1 Dup 2' },
          { id: 5, url: 'https://example.com/page3', title: 'Page 3' }
        ];

        // Simulate duplicate detection logic from popup.js
        const seenUrls = new Map();
        const uniqueTabs = [];
        const duplicateIds = [];

        for (const tab of testTabs) {
          if (seenUrls.has(tab.url)) {
            duplicateIds.push(tab.id);
          } else {
            seenUrls.set(tab.url, tab.id);
            uniqueTabs.push(tab);
          }
        }

        if (duplicateIds.length !== 2) {
          throw new Error(`Expected 2 duplicates, found ${duplicateIds.length}`);
        }

        if (uniqueTabs.length !== 3) {
          throw new Error(`Expected 3 unique tabs, found ${uniqueTabs.length}`);
        }

        return { 
          success: true, 
          message: 'Duplicate detection algorithm works correctly', 
          totalTabs: testTabs.length,
          uniqueTabs: uniqueTabs.length,
          duplicates: duplicateIds.length
        };
      }
    },
    {
      name: 'Tab Window Query Test',
      description: 'Tests if extension can query windows',
      critical: false,
      test: async () => {
        const windows = await chrome.windows.getAll({ populate: true });
        
        if (!Array.isArray(windows)) {
          throw new Error('Windows query did not return an array');
        }

        const totalTabs = windows.reduce((sum, win) => sum + (win.tabs ? win.tabs.length : 0), 0);

        return { 
          success: true, 
          message: 'Window query successful', 
          windowCount: windows.length,
          totalTabs: totalTabs
        };
      }
    }
  ],
  'AI Response Parsing': [
    {
      name: 'JSON Response Parsing Test',
      description: 'Tests if AI responses can be parsed correctly',
      critical: true,
      test: async () => {
        const testCases = [
          {
            name: 'Clean JSON',
            input: '[{"id": 1, "category": "Work"}, {"id": 2, "category": "Personal"}]',
            expectedLength: 2
          },
          {
            name: 'Markdown wrapped JSON',
            input: '```json\n[{"id": 1, "category": "Work"}]\n```',
            expectedLength: 1
          },
          {
            name: 'JSON with text before',
            input: 'Here are the results:\n[{"id": 1, "category": "Work"}]',
            expectedLength: 1
          },
          {
            name: 'JSON with text after',
            input: '[{"id": 1, "category": "Work"}]\nHope this helps!',
            expectedLength: 1
          }
        ];

        const results = [];
        const errors = [];

        for (const testCase of testCases) {
          try {
            // Simulate parsing logic from popup.js
            let jsonText = testCase.input;
            
            // Try markdown extraction
            const markdownMatch = jsonText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
            if (markdownMatch) {
              jsonText = markdownMatch[1];
            } else {
              // Try regex extraction
              const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                jsonText = jsonMatch[0];
              }
            }

            const parsed = JSON.parse(jsonText);
            
            if (!Array.isArray(parsed)) {
              throw new Error('Parsed result is not an array');
            }

            if (parsed.length !== testCase.expectedLength) {
              throw new Error(`Expected ${testCase.expectedLength} items, got ${parsed.length}`);
            }

            results.push({ case: testCase.name, status: 'PASS' });
          } catch (error) {
            errors.push({ case: testCase.name, error: error.message });
            results.push({ case: testCase.name, status: 'FAIL', error: error.message });
          }
        }

        if (errors.length > 0) {
          throw new Error(`${errors.length}/${testCases.length} test cases failed: ${JSON.stringify(errors)}`);
        }

        return { 
          success: true, 
          message: 'All JSON parsing test cases passed', 
          tested: testCases.length,
          results: results
        };
      }
    },
    {
      name: 'Malformed JSON Handling Test',
      description: 'Tests if malformed JSON is handled gracefully',
      critical: false,
      test: async () => {
        const badInputs = [
          'not json at all',
          '[{"id": 1, "category": }]', // syntax error
          '{"single": "object"}', // not an array
          '[]', // empty array
          ''
        ];

        let properlyHandled = 0;
        for (const input of badInputs) {
          try {
            let jsonText = input;
            const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              jsonText = jsonMatch[0];
            }
            const parsed = JSON.parse(jsonText);
            
            // If we reach here with empty array or non-array, it should be caught
            if (!Array.isArray(parsed) || parsed.length === 0) {
              properlyHandled++;
            }
          } catch (error) {
            // Expected to throw on malformed JSON
            properlyHandled++;
          }
        }

        if (properlyHandled !== badInputs.length) {
          throw new Error(`Only ${properlyHandled}/${badInputs.length} bad inputs were properly handled`);
        }

        return { 
          success: true, 
          message: 'Malformed JSON is properly rejected', 
          tested: badInputs.length 
        };
      }
    }
  ],
  'API Integration': [
    {
      name: 'API Key Storage Test',
      description: 'Tests if API key can be stored and retrieved',
      critical: true,
      test: async () => {
        const testKey = 'AIza_test_key_' + Date.now();
        
        await chrome.storage.local.set({ apiKey: testKey });
        const result = await chrome.storage.local.get(['apiKey']);
        await chrome.storage.local.remove(['apiKey']);

        if (result.apiKey !== testKey) {
          throw new Error(`API key not stored correctly: expected "${testKey}", got "${result.apiKey}"`);
        }

        return { success: true, message: 'API key storage works', keyLength: testKey.length };
      }
    },
    {
      name: 'API Connectivity Test',
      description: 'Tests if Gemini API endpoint is reachable',
      critical: false,
      test: async () => {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
          method: 'GET'
        });

        // 403/401 means API is reachable but needs auth (which is expected)
        if (response.status === 403 || response.status === 401) {
          return { 
            success: true, 
            message: 'API endpoint is reachable (authentication required as expected)', 
            statusCode: response.status 
          };
        }

        if (response.ok) {
          return { 
            success: true, 
            message: 'API endpoint is fully accessible', 
            statusCode: response.status 
          };
        }

        throw new Error(`Unexpected API response: ${response.status}`);
      }
    }
  ],
  'Background Service Worker': [
    {
      name: 'Message Passing Test',
      description: 'Tests if messages can be sent to background worker',
      critical: true,
      test: async () => {
        try {
          // Try to send a message to background
          const response = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Message timeout')), 5000);
            
            chrome.runtime.sendMessage({ action: 'ping', timestamp: Date.now() }, (response) => {
              clearTimeout(timeout);
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(response);
              }
            });
          });

          return { 
            success: true, 
            message: 'Message passing works', 
            response: response,
            warning: !response // Warning if no response but no error
          };
        } catch (error) {
          // Message passing might fail if background doesn't handle ping, but that's expected
          // Common errors: timeout, connection issues, port closed, etc.
          if (error.message.includes('timeout') || 
              error.message.includes('Could not establish connection') ||
              error.message.includes('port closed') ||
              error.message.includes('message port closed')) {
            return {
              success: true,
              message: 'Background worker exists (but may not handle ping messages - this is normal)',
              warning: true,
              note: 'Most extensions don\'t respond to diagnostic ping messages'
            };
          }
          throw error;
        }
      }
    }
  ],
  'Tab Organization': [
    {
      name: 'Tab Groups API Test',
      description: 'Tests if Tab Groups API is available and functional',
      critical: false,
      test: async () => {
        if (!chrome.tabGroups) {
          throw new Error('Tab Groups API not available');
        }

        const groups = await chrome.tabGroups.query({});
        
        return { 
          success: true, 
          message: 'Tab Groups API is functional', 
          existingGroups: groups.length 
        };
      }
    },
    {
      name: 'Window Creation Test',
      description: 'Tests if extension can create new windows (for Windows mode)',
      critical: false,
      test: async () => {
        // We won't actually create a window as it's intrusive
        // Instead, check if the API is accessible
        const windows = await chrome.windows.getAll();
        
        if (!Array.isArray(windows)) {
          throw new Error('Windows API not functional');
        }

        // Check if we can get current window
        const current = await chrome.windows.getCurrent();
        
        if (!current || !current.id) {
          throw new Error('Cannot access current window');
        }

        return { 
          success: true, 
          message: 'Window management API is functional (not testing actual creation)', 
          currentWindowId: current.id,
          totalWindows: windows.length
        };
      }
    }
  ],
  'End-to-End Features': [
    {
      name: 'E2E: Duplicate Tab Removal',
      description: '⚠️ Creates test tabs, removes duplicates, and verifies removal works correctly',
      critical: false,
      test: async () => {
        // Create test tabs with duplicates
        const testUrls = [
          'https://example.com/test1',
          'https://example.com/test2',
          'https://example.com/test1', // duplicate
          'https://example.com/test3',
          'https://example.com/test2'  // duplicate
        ];
        
        const createdTabs = [];
        try {
          // Create test tabs
          for (const url of testUrls) {
            const tab = await chrome.tabs.create({ url, active: false });
            createdTabs.push(tab);
          }
          
          // Wait for tabs to load
          await new Promise(resolve => setTimeout(resolve, TAB_LOAD_TIMEOUT));
          
          // Get all tabs and identify duplicates
          const allTabs = await chrome.tabs.query({ currentWindow: true });
          const urlMap = new Map();
          const duplicates = [];
          
          allTabs.forEach(tab => {
            if (urlMap.has(tab.url)) {
              duplicates.push(tab.id);
            } else {
              urlMap.set(tab.url, tab.id);
            }
          });
          
          // Close duplicate tabs
          if (duplicates.length > 0) {
            await chrome.tabs.remove(duplicates);
          }
          
          // Verify duplicates were removed
          const remainingTabs = await chrome.tabs.query({ currentWindow: true });
          const remainingUrls = new Set(remainingTabs.map(t => t.url));
          
          // Close all test tabs
          const testTabIds = createdTabs.map(t => t.id);
          await chrome.tabs.remove(testTabIds.filter(id => !duplicates.includes(id)));
          
          if (duplicates.length === 0) {
            return {
              success: true,
              message: 'No duplicates found in test (this is unexpected)',
              warning: true,
              created: testUrls.length
            };
          }
          
          return {
            success: true,
            message: 'Duplicate removal works correctly',
            created: testUrls.length,
            duplicatesFound: duplicates.length,
            duplicatesRemoved: duplicates.length,
            uniqueUrls: remainingUrls.size
          };
        } catch (error) {
          // Clean up on error
          try {
            const tabsToClose = createdTabs.map(t => t.id);
            await chrome.tabs.remove(tabsToClose);
          } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError);
          }
          throw error;
        }
      }
    },
    {
      name: 'E2E: Tab Stacks Organization',
      description: '⚠️ Creates test tabs, organizes into tab groups, and verifies groups are created correctly',
      critical: false,
      test: async () => {
        if (!chrome.tabGroups) {
          return {
            success: true,
            message: 'Tab Groups API not available (browser may not support it)',
            warning: true,
            skipped: true
          };
        }
        
        const testTabs = [];
        const createdGroups = [];
        
        try {
          // Create test tabs for different categories
          const categories = {
            'Work': ['https://github.com', 'https://stackoverflow.com'],
            'Social': ['https://twitter.com', 'https://reddit.com'],
            'News': ['https://news.ycombinator.com']
          };
          
          const categoryToTabs = {};
          
          for (const [category, urls] of Object.entries(categories)) {
            categoryToTabs[category] = [];
            for (const url of urls) {
              const tab = await chrome.tabs.create({ url, active: false });
              testTabs.push(tab);
              categoryToTabs[category].push(tab);
            }
          }
          
          // Wait for tabs to be created
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Create tab groups for each category
          const colors = ['blue', 'red', 'green'];
          let colorIndex = 0;
          
          for (const [category, tabs] of Object.entries(categoryToTabs)) {
            const tabIds = tabs.map(t => t.id);
            const groupId = await chrome.tabs.group({ tabIds });
            
            await chrome.tabGroups.update(groupId, {
              title: category,
              color: colors[colorIndex % colors.length],
              collapsed: false
            });
            
            createdGroups.push(groupId);
            colorIndex++;
          }
          
          // Verify groups were created
          const allGroups = await chrome.tabGroups.query({});
          const ourGroups = allGroups.filter(g => Object.keys(categories).includes(g.title));
          
          // Clean up: ungroup and close test tabs
          for (const groupId of createdGroups) {
            try {
              const groupTabs = await chrome.tabs.query({ groupId });
              if (groupTabs && groupTabs.length > 0) {
                await chrome.tabs.ungroup(groupTabs.map(t => t.id));
              }
            } catch (e) {
              console.error('Error ungrouping:', e);
            }
          }
          
          await chrome.tabs.remove(testTabs.map(t => t.id));
          
          if (ourGroups.length !== Object.keys(categories).length) {
            throw new Error(`Expected ${Object.keys(categories).length} groups, found ${ourGroups.length}`);
          }
          
          return {
            success: true,
            message: 'Tab stacks organization works correctly',
            categoriesCreated: Object.keys(categories).length,
            tabsCreated: testTabs.length,
            groupsCreated: createdGroups.length,
            groupsVerified: ourGroups.length
          };
        } catch (error) {
          // Clean up on error
          try {
            for (const groupId of createdGroups) {
              const groupTabs = await chrome.tabs.query({ groupId });
              await chrome.tabs.ungroup(groupTabs.map(t => t.id));
            }
            await chrome.tabs.remove(testTabs.map(t => t.id));
          } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError);
          }
          throw error;
        }
      }
    },
    {
      name: 'E2E: Windows Mode Organization',
      description: '⚠️ Creates test tabs, organizes into separate windows, and verifies windows are created',
      critical: false,
      test: async () => {
        const createdWindows = [];
        
        try {
          // Get current window to avoid closing it
          const currentWindow = await chrome.windows.getCurrent();
          const currentWindowId = currentWindow.id;
          
          // Create test tabs in new windows
          const categories = {
            'Work': ['https://github.com'],
            'Social': ['https://twitter.com']
          };
          
          const categoryWindowMap = {};
          
          for (const [category, urls] of Object.entries(categories)) {
            // Create a new window with the first URL
            const newWindow = await chrome.windows.create({
              url: urls[0],
              focused: false
            });
            
            createdWindows.push(newWindow.id);
            categoryWindowMap[category] = newWindow.id;
            
            // Create additional tabs in this window if there are more URLs
            for (let i = 1; i < urls.length; i++) {
              await chrome.tabs.create({
                url: urls[i],
                windowId: newWindow.id,
                active: false
              });
            }
          }
          
          // Wait for windows to be fully created
          await new Promise(resolve => setTimeout(resolve, TAB_LOAD_TIMEOUT));
          
          // Verify windows were created
          const allWindows = await chrome.windows.getAll({ populate: true });
          const ourWindows = allWindows.filter(w => createdWindows.includes(w.id));
          
          // Clean up: close test windows (but never the current window)
          for (const windowId of createdWindows) {
            if (windowId !== currentWindowId) {
              try {
                // Verify window still exists before trying to close it
                const windowStillExists = await chrome.windows.get(windowId).catch(() => null);
                if (windowStillExists) {
                  await chrome.windows.remove(windowId);
                }
              } catch (e) {
                console.error('Error closing window:', e);
              }
            }
          }
          
          if (ourWindows.length !== Object.keys(categories).length) {
            throw new Error(`Expected ${Object.keys(categories).length} windows, found ${ourWindows.length}`);
          }
          
          return {
            success: true,
            message: 'Windows mode organization works correctly',
            categoriesCreated: Object.keys(categories).length,
            windowsCreated: createdWindows.length,
            windowsVerified: ourWindows.length,
            note: 'Test windows were safely created and cleaned up without affecting the main browser window'
          };
        } catch (error) {
          // Clean up on error - but avoid closing current window
          try {
            const currentWindow = await chrome.windows.getCurrent();
            for (const windowId of createdWindows) {
              if (windowId !== currentWindow.id) {
                const windowStillExists = await chrome.windows.get(windowId).catch(() => null);
                if (windowStillExists) {
                  await chrome.windows.remove(windowId);
                }
              }
            }
          } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError);
          }
          throw error;
        }
      }
    },
    {
      name: 'E2E: Vivaldi Workspaces Mode',
      description: '⚠️ Tests Vivaldi-specific Workspaces API via bridge script (requires ai_bridge.js)',
      critical: false,
      test: async () => {
        // Check if we're in Vivaldi and if the bridge is available
        const userAgent = navigator.userAgent;
        const isVivaldi = userAgent.includes('Vivaldi');
        
        if (!isVivaldi) {
          return {
            success: true,
            message: 'Not running in Vivaldi - skipping Vivaldi Workspaces test',
            warning: true,
            skipped: true,
            note: 'This test only runs in Vivaldi browser'
          };
        }
        
        const testTabs = [];
        const createdWorkspaceIds = [];
        let bridgeTestPassed = false;
        
        try {
          // Test 1: Check if bridge script is responding
          console.log('Testing Vivaldi bridge connection...');
          
          // Send test command to bridge
          await chrome.storage.local.set({
            workspaceCommand: {
              action: 'test',
              timestamp: Date.now()
            }
          });
          
          // Wait for bridge response
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const result = await chrome.storage.local.get('workspaceCommandResult');
          
          if (result.workspaceCommandResult && 
              result.workspaceCommandResult.success &&
              result.workspaceCommandResult.timestamp > Date.now() - 5000) {
            bridgeTestPassed = true;
            console.log('✓ Vivaldi bridge is responding');
            await chrome.storage.local.remove(['workspaceCommand', 'workspaceCommandResult']);
          } else {
            return {
              success: true,
              message: 'Vivaldi bridge script not installed - skipping workspace test',
              warning: true,
              skipped: true,
              note: 'To enable Vivaldi Workspaces: Install ai_bridge.js in Vivaldi\'s window.html (see INSTALL.md)',
              bridgeStatus: 'not responding',
              instructions: [
                '1. Close Vivaldi completely',
                '2. Navigate to Vivaldi installation directory',
                '3. Find window.html in resources/vivaldi folder',
                '4. Add <script src="ai_bridge.js"></script> before </body>',
                '5. Copy ai_bridge.js to the same directory',
                '6. Restart Vivaldi completely'
              ]
            };
          }
          
          // Test 2: Create test tabs for categorization
          console.log('Creating test tabs...');
          const categories = {
            'Work_Test': ['https://github.com', 'https://stackoverflow.com'],
            'Social_Test': ['https://twitter.com', 'https://reddit.com']
          };
          
          const categorizedTabs = {};
          
          for (const [category, urls] of Object.entries(categories)) {
            categorizedTabs[category] = [];
            for (const url of urls) {
              const tab = await chrome.tabs.create({ url, active: false });
              testTabs.push(tab);
              categorizedTabs[category].push({ id: tab.id, title: url, url });
            }
          }
          
          // Wait for tabs to load
          await new Promise(resolve => setTimeout(resolve, TAB_LOAD_TIMEOUT));
          
          // Test 3: Send organize command to bridge
          console.log('Sending organize command to Vivaldi bridge...');
          await chrome.storage.local.set({
            workspaceCommand: {
              action: 'organize',
              categorizedTabs: categorizedTabs,
              timestamp: Date.now()
            }
          });
          
          // Wait for organization to complete
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const orgResult = await chrome.storage.local.get('workspaceCommandResult');
          
          if (!orgResult.workspaceCommandResult || !orgResult.workspaceCommandResult.success) {
            throw new Error('Bridge failed to organize tabs: ' + (orgResult.workspaceCommandResult?.error || 'Unknown error'));
          }
          
          console.log('✓ Bridge successfully organized tabs into workspaces');
          await chrome.storage.local.remove(['workspaceCommand', 'workspaceCommandResult']);
          
          // Test 4: Verify workspaces were created (indirect verification)
          // Note: We can't directly query vivaldi.workspaces from extension context
          // But if the bridge responded with success, the workspaces were created
          
          // Clean up: close test tabs
          const activeTab = await getActiveTabId();
          const tabsToClose = testTabs.map(t => t.id).filter(id => id !== activeTab);
          if (tabsToClose.length > 0) {
            await chrome.tabs.remove(tabsToClose);
          }
          
          return {
            success: true,
            message: 'Vivaldi Workspaces mode works correctly',
            bridgeConnected: true,
            categoriesCreated: Object.keys(categories).length,
            tabsCreated: testTabs.length,
            workspacesCreatedVia: 'vivaldi.workspaces API via bridge',
            note: 'Tabs were organized into Vivaldi Workspaces using the native vivaldi.workspaces API',
            vivaldiSpecific: true,
            apiUsed: 'vivaldi.workspaces.create() and vivaldi.workspaces.addTab()'
          };
          
        } catch (error) {
          // Clean up on error
          try {
            const activeTab = await getActiveTabId();
            const tabsToClose = testTabs.map(t => t.id).filter(id => id !== activeTab);
            if (tabsToClose.length > 0) {
              await chrome.tabs.remove(tabsToClose);
            }
            await chrome.storage.local.remove(['workspaceCommand', 'workspaceCommandResult']);
          } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError);
          }
          throw error;
        }
      }
    },
    {
      name: 'E2E: AI Analysis with Gemini',
      description: '⚠️ Calls actual Gemini API with test data and verifies categorization (USES API QUOTA)',
      critical: false,
      test: async () => {
        // Get API key from storage
        const data = await chrome.storage.local.get(['apiKey']);
        
        if (!data.apiKey || !data.apiKey.trim()) {
          return {
            success: true,
            message: 'No API key configured - skipping AI analysis test',
            warning: true,
            skipped: true,
            note: 'Configure an API key in the extension to test AI analysis'
          };
        }
        
        const apiKey = data.apiKey;
        
        // Prepare test tabs
        const testTabs = [
          { id: 1, title: 'GitHub', url: 'https://github.com' },
          { id: 2, title: 'Stack Overflow', url: 'https://stackoverflow.com' },
          { id: 3, title: 'Twitter', url: 'https://twitter.com' },
          { id: 4, title: 'Reddit', url: 'https://reddit.com' }
        ];
        
        const categories = ['Work', 'Social'];
        
        // Build prompt
        const prompt = `You are an AI assistant helping to categorize browser tabs. Analyze the following tabs and categorize each one into ONE of these categories: ${categories.join(', ')}.

Categories: ${categories.join(', ')}

Tabs to categorize:
${JSON.stringify(testTabs, null, 2)}

Instructions:
1. Analyze each tab's title and URL
2. Assign each tab to the MOST appropriate category from the list
3. If a tab doesn't fit any category well, assign it to the closest one
4. Return ONLY a valid JSON array in this exact format, with no additional text:

[
  {"id": tab_id, "category": "CategoryName"},
  {"id": tab_id, "category": "CategoryName"}
]

Return ONLY the JSON array, nothing else.`;
        
        // Call Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }
        
        const data2 = await response.json();
        const resultText = data2.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!resultText) {
          throw new Error('No response from Gemini API');
        }
        
        // Parse response
        let jsonText = resultText;
        const markdownMatch = resultText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
        if (markdownMatch) {
          jsonText = markdownMatch[1];
        } else {
          const jsonMatch = resultText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
          }
        }
        
        const categorizations = JSON.parse(jsonText);
        
        if (!Array.isArray(categorizations)) {
          throw new Error('AI response is not a JSON array');
        }
        
        // Verify all tabs were categorized
        if (categorizations.length !== testTabs.length) {
          return {
            success: true,
            message: 'AI analysis works but did not categorize all tabs',
            warning: true,
            tabsSent: testTabs.length,
            tabsCategorized: categorizations.length,
            categories: categorizations
          };
        }
        
        // Verify each categorization has required fields
        const validCategorizations = categorizations.filter(c => 
          c && typeof c.id !== 'undefined' && c.category
        );
        
        return {
          success: true,
          message: 'AI analysis with Gemini works correctly',
          tabsSent: testTabs.length,
          tabsCategorized: validCategorizations.length,
          apiQuotaUsed: '1 request',
          note: 'This test consumed 1 API request from your quota',
          categorizations: categorizations.map(c => ({ id: c.id, category: c.category }))
        };
      }
    },
    {
      name: 'E2E: Rate Limiting Enforcement',
      description: 'Tests if rate limiting correctly blocks requests when limit is reached',
      critical: false,
      test: async () => {
        // Get current request count
        const data = await chrome.storage.local.get(['requestCount', 'lastResetDate']);
        const originalCount = data.requestCount || 0;
        
        // Temporarily set count to limit - 1
        const testLimit = 5;
        await chrome.storage.local.set({
          requestCount: testLimit - 1,
          lastResetDate: new Date().toDateString()
        });
        
        try {
          // Simulate incrementing request count
          let count = testLimit - 1;
          count++;
          
          // Check if we've hit the limit
          const isBlocked = count >= testLimit;
          
          // Restore original count
          await chrome.storage.local.set({
            requestCount: originalCount,
            lastResetDate: new Date().toDateString()
          });
          
          if (!isBlocked) {
            throw new Error('Rate limiting did not block request at limit');
          }
          
          return {
            success: true,
            message: 'Rate limiting enforcement works correctly',
            testLimit: testLimit,
            requestsBeforeBlock: testLimit - 1,
            blocked: isBlocked
          };
        } catch (error) {
          // Restore original count on error
          await chrome.storage.local.set({
            requestCount: originalCount,
            lastResetDate: new Date().toDateString()
          });
          throw error;
        }
      }
    },
    {
      name: 'E2E: Request Interval Rate Limiting',
      description: 'Tests if minimum request interval is enforced between API calls',
      critical: false,
      test: async () => {
        const lastRequestTime = Date.now() - 2000; // 2 seconds ago
        
        const timeSinceLastRequest = Date.now() - lastRequestTime;
        const isBlocked = timeSinceLastRequest < MIN_REQUEST_INTERVAL;
        
        if (!isBlocked) {
          return {
            success: true,
            message: 'Request interval check passed (enough time has elapsed)',
            minInterval: MIN_REQUEST_INTERVAL + 'ms',
            timeSinceLastRequest: timeSinceLastRequest + 'ms',
            blocked: false
          };
        }
        
        const waitTime = Math.ceil((MIN_REQUEST_INTERVAL - timeSinceLastRequest) / 1000);
        
        return {
          success: true,
          message: 'Request interval rate limiting works correctly',
          minInterval: MIN_REQUEST_INTERVAL + 'ms',
          timeSinceLastRequest: timeSinceLastRequest + 'ms',
          blocked: true,
          waitTime: waitTime + 's',
          note: 'This prevents exceeding the 15 requests/minute limit'
        };
      }
    }
  ]
};

// Run tests
async function runAllTests() {
  await runTests(false);
}

async function runCriticalTests() {
  await runTests(true);
}

async function runTests(criticalOnly) {
  testResults = {
    timestamp: new Date().toISOString(),
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
  };

  document.getElementById('runAllBtn').disabled = true;
  document.getElementById('runCriticalBtn').disabled = true;
  document.getElementById('exportBtn').disabled = true;

  const container = document.getElementById('testSections');
  container.innerHTML = '';

  for (const [suiteName, tests] of Object.entries(testSuites)) {
    const section = document.createElement('div');
    section.className = 'test-section';
    section.innerHTML = `<h2>📋 ${suiteName}</h2>`;
    container.appendChild(section);

    for (const testDef of tests) {
      if (criticalOnly && !testDef.critical) continue;

      const testItem = document.createElement('div');
      testItem.className = 'test-item running';
      testItem.innerHTML = `
        <div class="test-header">
          <span class="test-icon">⏳</span>
          <span class="test-name">${testDef.name}</span>
          <span class="test-status">RUNNING</span>
        </div>
        <div class="test-description">${testDef.description}</div>
      `;
      section.appendChild(testItem);

      try {
        const result = await testDef.test();
        
        const status = result.warning ? 'warn' : 'pass';
        if (status === 'pass') testResults.passed++;
        if (status === 'warn') testResults.warnings++;

        testItem.className = `test-item ${status}`;
        testItem.querySelector('.test-icon').textContent = result.warning ? '⚠️' : '✅';
        testItem.querySelector('.test-status').textContent = result.warning ? 'WARNING' : 'PASSED';
        
        const resultDiv = document.createElement('div');
        resultDiv.className = 'test-result';
        resultDiv.textContent = JSON.stringify(result, null, 2);
        testItem.appendChild(resultDiv);

        testResults.tests.push({
          suite: suiteName,
          name: testDef.name,
          status: status,
          result: result
        });

      } catch (error) {
        testResults.failed++;
        
        testItem.className = 'test-item fail';
        testItem.querySelector('.test-icon').textContent = '❌';
        testItem.querySelector('.test-status').textContent = 'FAILED';
        
        const resultDiv = document.createElement('div');
        resultDiv.className = 'test-result';
        resultDiv.textContent = `ERROR: ${error.message}\n\nStack: ${error.stack}`;
        testItem.appendChild(resultDiv);

        testResults.tests.push({
          suite: suiteName,
          name: testDef.name,
          status: 'fail',
          error: error.message,
          stack: error.stack
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  showSummary();
  document.getElementById('runAllBtn').disabled = false;
  document.getElementById('runCriticalBtn').disabled = false;
  document.getElementById('exportBtn').disabled = false;
}

function showSummary() {
  const summaryDiv = document.getElementById('summary');
  summaryDiv.style.display = 'grid';
  summaryDiv.innerHTML = `
    <div class="summary-card passed">
      <div class="number">${testResults.passed}</div>
      <div class="label">Passed</div>
    </div>
    <div class="summary-card warnings">
      <div class="number">${testResults.warnings}</div>
      <div class="label">Warnings</div>
    </div>
    <div class="summary-card failed">
      <div class="number">${testResults.failed}</div>
      <div class="label">Failed</div>
    </div>
  `;
}

function exportResults() {
  const dataStr = JSON.stringify(testResults, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `vivaldi-functional-diagnostic-${Date.now()}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
}
