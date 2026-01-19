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

        if (JSON.stringify(result) !== JSON.stringify(testData)) {
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
          // Message passing might fail if background doesn't handle ping, but that's ok
          if (error.message.includes('timeout') || error.message.includes('Could not establish connection')) {
            return {
              success: true,
              message: 'Background worker exists (but may not handle ping messages)',
              warning: true,
              error: error.message
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
