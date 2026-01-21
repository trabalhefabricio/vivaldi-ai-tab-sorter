// diagnostics.js - Diagnostic tool for Vivaldi AI Tab Sorter

class Diagnostics {
  constructor() {
    this.log = [];
    this.init();
  }
  
  async init() {
    this.setupEventListeners();
    await this.runDiagnostics();
  }
  
  setupEventListeners() {
    document.getElementById('runDiagnostics').addEventListener('click', () => {
      this.runDiagnostics();
    });
    
    document.getElementById('testVivaldiApi').addEventListener('click', () => {
      this.testVivaldiApi();
    });
    
    document.getElementById('backToMain').addEventListener('click', () => {
      window.location.href = 'popup.html';
    });
  }
  
  addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    this.log.push(logEntry);
    this.updateLogDisplay();
  }
  
  updateLogDisplay() {
    const logDiv = document.getElementById('diagnosticLog');
    logDiv.textContent = this.log.slice(-20).join('\n');
    logDiv.scrollTop = logDiv.scrollHeight;
  }
  
  setStatus(elementId, value, isOk = null) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.textContent = value;
    element.className = 'status-value';
    
    if (isOk === true) {
      element.classList.add('status-ok');
    } else if (isOk === false) {
      element.classList.add('status-error');
    } else if (isOk === 'warning') {
      element.classList.add('status-warning');
    }
  }
  
  async runDiagnostics() {
    this.addLog('Starting diagnostics...');
    this.log = ['=== Vivaldi AI Tab Sorter Diagnostics ===', ''];
    
    // 1. Detect browser
    await this.detectBrowser();
    
    // 2. Check extension status
    await this.checkExtensionStatus();
    
    // 3. Check APIs
    await this.checkAPIs();
    
    // 4. Get current state
    await this.getCurrentState();
    
    // 5. Test Vivaldi Core injection
    await this.checkVivaldiCore();
    
    this.addLog('Diagnostics complete');
  }
  
  async detectBrowser() {
    this.addLog('Detecting browser...');
    
    const userAgent = navigator.userAgent;
    const isVivaldi = userAgent.includes('Vivaldi');
    const isChrome = userAgent.includes('Chrome');
    const isEdge = userAgent.includes('Edg');
    
    let browserName = 'Unknown';
    if (isVivaldi) browserName = 'Vivaldi';
    else if (isEdge) browserName = 'Edge';
    else if (isChrome) browserName = 'Chrome';
    
    this.setStatus('browserName', browserName, isVivaldi);
    this.setStatus('vivaldiDetected', isVivaldi ? '✓ Yes' : '✗ No', isVivaldi);
    
    if (isVivaldi) {
      this.addLog('✓ Vivaldi browser detected', 'success');
    } else {
      this.addLog(`✗ Not Vivaldi (detected: ${browserName})`, 'warning');
    }
  }
  
  async checkExtensionStatus() {
    this.addLog('Checking extension status...');
    
    try {
      // Check if content script is injected
      const result = await chrome.storage.local.get('vivaldiApiStatus');
      
      if (result.vivaldiApiStatus && result.vivaldiApiStatus.available) {
        this.setStatus('injectionStatus', '✓ Active', true);
        this.setStatus('vivaldiApiStatus', '✓ Available', true);
        this.addLog('✓ Auto-injection is working', 'success');
      } else {
        this.setStatus('injectionStatus', '✗ Not detected', false);
        this.setStatus('vivaldiApiStatus', '✗ Not available', false);
        this.addLog('✗ Auto-injection not detected', 'error');
      }
    } catch (error) {
      this.setStatus('injectionStatus', '✗ Error', false);
      this.setStatus('vivaldiApiStatus', '✗ Error', false);
      this.addLog(`Error checking injection: ${error.message}`, 'error');
    }
  }
  
  async checkAPIs() {
    this.addLog('Checking available APIs...');
    
    try {
      // Check chrome.tabGroups
      const hasTabGroups = typeof chrome.tabGroups !== 'undefined';
      this.setStatus('apiTabGroups', hasTabGroups ? '✓ Available' : '✗ Not available', hasTabGroups ? 'warning' : false);
      this.addLog(`chrome.tabGroups: ${hasTabGroups ? 'Available (but not fully supported in Vivaldi)' : 'Not available'}`, hasTabGroups ? 'warning' : 'info');
      
      // Check Vivaldi APIs from storage
      const result = await chrome.storage.local.get('vivaldiApiStatus');
      
      if (result.vivaldiApiStatus && result.vivaldiApiStatus.apis) {
        const apis = result.vivaldiApiStatus.apis;
        
        this.setStatus('apiWorkspaces', apis.workspaces ? '✓ Available' : '✗ Not available', apis.workspaces);
        this.setStatus('apiTabsPrivate', apis.tabsPrivate ? '✓ Available' : '✗ Not available', apis.tabsPrivate);
        
        this.addLog(`vivaldi.workspaces: ${apis.workspaces ? 'Available' : 'Not available'}`, apis.workspaces ? 'success' : 'error');
        this.addLog(`vivaldi.tabsPrivate: ${apis.tabsPrivate ? 'Available' : 'Not available'}`, apis.tabsPrivate ? 'success' : 'warning');
      } else {
        this.setStatus('apiWorkspaces', '? Unknown', null);
        this.setStatus('apiTabsPrivate', '? Unknown', null);
        this.addLog('Vivaldi API status unknown - may not be injected yet', 'warning');
      }
    } catch (error) {
      this.addLog(`Error checking APIs: ${error.message}`, 'error');
    }
  }
  
  async getCurrentState() {
    this.addLog('Getting current state...');
    
    try {
      // Get tab count
      const tabs = await chrome.tabs.query({});
      this.setStatus('tabCount', tabs.length, true);
      this.addLog(`Found ${tabs.length} open tabs`);
      
      // Get window count
      const windows = await chrome.windows.getAll();
      this.setStatus('windowCount', windows.length, true);
      this.addLog(`Found ${windows.length} open windows`);
      
      // Get workspace count from storage
      const result = await chrome.storage.local.get('vivaldiApiStatus');
      if (result.vivaldiApiStatus && result.vivaldiApiStatus.available) {
        // Try to get workspaces via diagnostic command
        await this.requestDiagnostics();
      } else {
        this.setStatus('workspaceCount', 'N/A', 'warning');
        this.addLog('Cannot get workspace count - Vivaldi API not available', 'warning');
      }
    } catch (error) {
      this.addLog(`Error getting current state: ${error.message}`, 'error');
    }
  }
  
  async checkVivaldiCore() {
    this.addLog('Checking Vivaldi Core injection...');
    
    try {
      // Send test command to vivaldi-core.js
      await chrome.storage.local.set({
        workspaceCommand: {
          action: 'test',
          timestamp: Date.now()
        }
      });
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = await chrome.storage.local.get('workspaceCommandResult');
      
      if (result.workspaceCommandResult && result.workspaceCommandResult.success) {
        this.addLog('✓ Vivaldi Core is responding', 'success');
        if (result.workspaceCommandResult.message) {
          this.addLog(`Response: ${result.workspaceCommandResult.message}`, 'success');
        }
      } else {
        this.addLog('✗ No response from Vivaldi Core', 'error');
      }
      
      // Clean up
      await chrome.storage.local.remove(['workspaceCommand', 'workspaceCommandResult']);
      
    } catch (error) {
      this.addLog(`Error testing Vivaldi Core: ${error.message}`, 'error');
    }
  }
  
  async requestDiagnostics() {
    try {
      await chrome.storage.local.set({
        workspaceCommand: {
          action: 'diagnostics',
          timestamp: Date.now()
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = await chrome.storage.local.get('workspaceCommandResult');
      
      if (result.workspaceCommandResult && result.workspaceCommandResult.diagnostics) {
        const diag = result.workspaceCommandResult.diagnostics;
        
        if (diag.workspaces) {
          this.setStatus('workspaceCount', diag.workspaces.length, true);
          this.addLog(`Found ${diag.workspaces.length} workspaces`);
        }
      }
      
      await chrome.storage.local.remove(['workspaceCommand', 'workspaceCommandResult']);
    } catch (error) {
      this.addLog(`Error requesting diagnostics: ${error.message}`, 'error');
    }
  }
  
  async testVivaldiApi() {
    this.addLog('=== Testing Vivaldi API ===', 'test');
    document.getElementById('testVivaldiApi').disabled = true;
    
    try {
      await chrome.storage.local.set({
        workspaceCommand: {
          action: 'test',
          timestamp: Date.now()
        }
      });
      
      this.addLog('Sent test command to Vivaldi Core...');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = await chrome.storage.local.get('workspaceCommandResult');
      
      if (result.workspaceCommandResult) {
        if (result.workspaceCommandResult.success) {
          this.addLog('✓ TEST PASSED: Vivaldi API is working!', 'success');
          this.addLog(`Message: ${result.workspaceCommandResult.message || 'N/A'}`);
          
          if (result.workspaceCommandResult.apis) {
            this.addLog(`Available APIs: ${JSON.stringify(result.workspaceCommandResult.apis)}`);
          }
        } else {
          this.addLog('✗ TEST FAILED: Vivaldi API error', 'error');
          this.addLog(`Error: ${result.workspaceCommandResult.error || 'Unknown error'}`);
        }
      } else {
        this.addLog('✗ TEST FAILED: No response from Vivaldi Core', 'error');
        this.addLog('Make sure you are running this in Vivaldi browser', 'warning');
      }
      
      await chrome.storage.local.remove(['workspaceCommand', 'workspaceCommandResult']);
      
    } catch (error) {
      this.addLog(`✗ TEST ERROR: ${error.message}`, 'error');
    } finally {
      document.getElementById('testVivaldiApi').disabled = false;
    }
  }
}

// Initialize diagnostics when page loads
document.addEventListener('DOMContentLoaded', () => {
  new Diagnostics();
});
