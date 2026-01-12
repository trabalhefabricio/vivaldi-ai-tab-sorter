// Popup.js - Main logic for Vivaldi AI Tab Sorter

class TabSorter {
  constructor() {
    this.apiKey = '';
    this.categories = [];
    this.logicRules = '';
    this.removeDuplicates = false;
    this.mode = 'workspaces';
    this.analyzedTabs = null;
    this.allTabs = [];
    
    this.init();
  }
  
  async init() {
    // Load saved settings
    await this.loadSettings();
    
    // Setup event listeners
    this.setupEventListeners();
  }
  
  async loadSettings() {
    try {
      const data = await chrome.storage.local.get([
        'apiKey', 
        'categories', 
        'logicRules', 
        'removeDuplicates', 
        'mode'
      ]);
      
      // Restore settings to UI
      if (data.apiKey) {
        document.getElementById('apiKey').value = data.apiKey;
        this.apiKey = data.apiKey;
      }
      
      if (data.categories) {
        document.getElementById('categories').value = data.categories;
        this.categories = data.categories.split(',').map(c => c.trim()).filter(c => c);
      }
      
      if (data.logicRules) {
        document.getElementById('logicRules').value = data.logicRules;
        this.logicRules = data.logicRules;
      }
      
      if (data.removeDuplicates !== undefined) {
        document.getElementById('removeDuplicates').checked = data.removeDuplicates;
        this.removeDuplicates = data.removeDuplicates;
      }
      
      if (data.mode) {
        const modeRadio = document.getElementById(`mode${this.capitalizeFirst(data.mode)}`);
        if (modeRadio) {
          modeRadio.checked = true;
          this.mode = data.mode;
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  setupEventListeners() {
    // Save settings on change
    document.getElementById('apiKey').addEventListener('input', (e) => {
      this.apiKey = e.target.value;
      this.saveSettings();
    });
    
    document.getElementById('categories').addEventListener('input', (e) => {
      // Sanitize category input - remove any HTML/script tags repeatedly to handle nested tags
      let sanitized = e.target.value;
      let previousValue;
      // Keep removing tags until no more tags are found (handles nested tags)
      do {
        previousValue = sanitized;
        sanitized = sanitized.replace(/<[^>]*>/g, '');
      } while (sanitized !== previousValue);
      
      if (sanitized !== e.target.value) {
        e.target.value = sanitized;
      }
      this.categories = sanitized.split(',').map(c => c.trim()).filter(c => c);
      this.saveSettings();
    });
    
    document.getElementById('logicRules').addEventListener('input', (e) => {
      this.logicRules = e.target.value;
      this.saveSettings();
    });
    
    document.getElementById('removeDuplicates').addEventListener('change', (e) => {
      this.removeDuplicates = e.target.checked;
      this.saveSettings();
    });
    
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.mode = e.target.value;
          this.saveSettings();
        }
      });
    });
    
    // Action buttons
    document.getElementById('analyzeBtn').addEventListener('click', () => this.analyze());
    document.getElementById('applyBtn').addEventListener('click', () => this.apply());
  }
  
  async saveSettings() {
    try {
      await chrome.storage.local.set({
        apiKey: this.apiKey,
        categories: this.categories.join(', '),
        logicRules: this.logicRules,
        removeDuplicates: this.removeDuplicates,
        mode: this.mode
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }
  
  async analyze() {
    try {
      // Validate inputs
      if (!this.apiKey || !this.apiKey.trim()) {
        this.showStatus('Please enter your Gemini API key', 'error');
        return;
      }
      
      // Validate API key format (Gemini API keys typically start with "AI" and are 39+ characters)
      const trimmedKey = this.apiKey.trim();
      if (!trimmedKey.startsWith('AI') || trimmedKey.length < 35) {
        this.showStatus('Invalid API key format. Please check your Gemini API key.', 'error');
        return;
      }
      
      if (this.categories.length === 0) {
        this.showStatus('Please enter at least one category', 'error');
        return;
      }
      
      this.showStatus('Collecting tabs from all windows...', 'info');
      document.getElementById('analyzeBtn').disabled = true;
      
      // Collect all tabs from all windows
      this.allTabs = await this.getAllTabs();
      
      if (this.allTabs.length === 0) {
        this.showStatus('No tabs found', 'error');
        document.getElementById('analyzeBtn').disabled = false;
        return;
      }
      
      this.showStatus(`Found ${this.allTabs.length} tabs. Analyzing with AI...`, 'info');
      
      // Remove duplicates if requested
      let tabsToAnalyze = this.allTabs;
      if (this.removeDuplicates) {
        tabsToAnalyze = this.findUniqueTabs(this.allTabs);
        this.showStatus(`Removed ${this.allTabs.length - tabsToAnalyze.length} duplicates. Analyzing ${tabsToAnalyze.length} tabs...`, 'info');
      }
      
      // Analyze tabs with Gemini
      this.analyzedTabs = await this.analyzeTabsWithGemini(tabsToAnalyze);
      
      // Show preview
      this.showPreview(this.analyzedTabs);
      
      // Enable apply button
      document.getElementById('applyBtn').disabled = false;
      document.getElementById('analyzeBtn').disabled = false;
      
      this.showStatus('Analysis complete! Review the preview and click "Apply Sorting"', 'success');
      
    } catch (error) {
      console.error('Error analyzing tabs:', error);
      // Sanitize error message to avoid exposing sensitive information like API keys
      const sanitizedMessage = this.sanitizeErrorMessage(error.message);
      this.showStatus(`Error: ${sanitizedMessage}`, 'error');
      document.getElementById('analyzeBtn').disabled = false;
    }
  }
  
  async getAllTabs() {
    try {
      // Get all tabs from all windows
      const tabs = await chrome.tabs.query({});
      return tabs.map(tab => ({
        id: tab.id,
        title: tab.title || '',
        url: tab.url || '',
        windowId: tab.windowId,
        index: tab.index
      }));
    } catch (error) {
      console.error('Error getting tabs:', error);
      throw error;
    }
  }
  
  findUniqueTabs(tabs) {
    const seenUrls = new Map();
    const uniqueTabs = [];
    const duplicatesToClose = [];
    
    tabs.forEach(tab => {
      const url = tab.url;
      if (seenUrls.has(url)) {
        duplicatesToClose.push(tab.id);
      } else {
        seenUrls.set(url, true);
        uniqueTabs.push(tab);
      }
    });
    
    // Close duplicate tabs
    if (duplicatesToClose.length > 0) {
      chrome.tabs.remove(duplicatesToClose).catch(err => {
        console.error('Error removing duplicate tabs:', err);
      });
    }
    
    return uniqueTabs;
  }
  
  async analyzeTabsWithGemini(tabs) {
    try {
      // Prepare the prompt for Gemini
      const tabsInfo = tabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        url: tab.url
      }));
      
      const prompt = this.buildGeminiPrompt(tabsInfo);
      
      // Call Gemini API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resultText) {
        throw new Error('No response from Gemini API');
      }
      
      // Parse the JSON response
      const categorizedTabs = this.parseGeminiResponse(resultText, tabs);
      
      return categorizedTabs;
      
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw error;
    }
  }
  
  buildGeminiPrompt(tabsInfo) {
    const categoriesList = this.categories.join(', ');
    const rulesSection = this.logicRules ? `\n\nAdditional Logic Rules:\n${this.logicRules}` : '';
    
    return `You are an AI assistant helping to categorize browser tabs. Analyze the following tabs and categorize each one into ONE of these categories: ${categoriesList}.

Categories: ${categoriesList}
${rulesSection}

Tabs to categorize:
${JSON.stringify(tabsInfo, null, 2)}

Instructions:
1. Analyze each tab's title and URL
2. Assign each tab to the MOST appropriate category from the list
3. If a tab doesn't fit any category well, assign it to the closest one
4. Consider the logic rules if provided
5. Return ONLY a valid JSON array in this exact format, with no additional text:

[
  {"id": tab_id, "category": "CategoryName"},
  {"id": tab_id, "category": "CategoryName"}
]

Return ONLY the JSON array, nothing else.`;
  }
  
  parseGeminiResponse(responseText, originalTabs) {
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Could not find JSON array in response');
      }
      
      const categorizations = JSON.parse(jsonMatch[0]);
      
      // Create a map of categorized tabs
      const categorizedTabs = {};
      this.categories.forEach(cat => {
        categorizedTabs[cat] = [];
      });
      
      // Add an "Uncategorized" category for any tabs not assigned
      categorizedTabs['Uncategorized'] = [];
      
      // Map categorizations back to original tabs
      const categorizationMap = new Map();
      categorizations.forEach(item => {
        categorizationMap.set(item.id, item.category);
      });
      
      originalTabs.forEach(tab => {
        const category = categorizationMap.get(tab.id);
        if (category && categorizedTabs[category]) {
          categorizedTabs[category].push(tab);
        } else {
          categorizedTabs['Uncategorized'].push(tab);
        }
      });
      
      return categorizedTabs;
      
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      throw new Error('Failed to parse AI response. Please try again.');
    }
  }
  
  showPreview(categorizedTabs) {
    const previewDiv = document.getElementById('preview');
    previewDiv.innerHTML = '<h3 style="margin-bottom: 12px; font-size: 14px;">📊 Preview</h3>';
    
    let totalTabs = 0;
    Object.keys(categorizedTabs).forEach(category => {
      const tabs = categorizedTabs[category];
      if (tabs.length > 0) {
        totalTabs += tabs.length;
        const item = document.createElement('div');
        item.className = 'preview-item';
        
        // Use textContent to prevent XSS
        const categorySpan = document.createElement('span');
        categorySpan.className = 'preview-category';
        categorySpan.textContent = category;
        
        const countSpan = document.createElement('span');
        countSpan.className = 'preview-count';
        countSpan.textContent = `(${tabs.length} tab${tabs.length !== 1 ? 's' : ''})`;
        
        item.appendChild(categorySpan);
        item.appendChild(countSpan);
        previewDiv.appendChild(item);
      }
    });
    
    const totalItem = document.createElement('div');
    totalItem.className = 'preview-item';
    totalItem.style.fontWeight = 'bold';
    totalItem.style.marginTop = '8px';
    totalItem.style.paddingTop = '8px';
    totalItem.textContent = `Total: ${totalTabs} tabs`;
    previewDiv.appendChild(totalItem);
    
    previewDiv.classList.add('visible');
  }
  
  async apply() {
    try {
      if (!this.analyzedTabs) {
        this.showStatus('Please analyze tabs first', 'error');
        return;
      }
      
      this.showStatus('Applying sorting...', 'info');
      document.getElementById('applyBtn').disabled = true;
      
      if (this.mode === 'workspaces') {
        await this.applyWorkspaceMode();
      } else if (this.mode === 'stacks') {
        await this.applyStackMode();
      } else if (this.mode === 'windows') {
        await this.applyWindowMode();
      }
      
      this.showStatus('✅ Tabs sorted successfully!', 'success');
      
      // Reset state
      setTimeout(() => {
        window.close();
      }, 2000);
      
    } catch (error) {
      console.error('Error applying sorting:', error);
      const sanitizedMessage = this.sanitizeErrorMessage(error.message);
      this.showStatus(`Error: ${sanitizedMessage}`, 'error');
      document.getElementById('applyBtn').disabled = false;
    }
  }
  
  async applyWorkspaceMode() {
    // Send message to background script to handle workspace creation
    // This requires the bridge script in Vivaldi
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'organizeToWorkspaces',
        categorizedTabs: this.analyzedTabs
      });
      
      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to organize tabs into workspaces');
      }
    } catch (error) {
      console.error('Error in workspace mode:', error);
      throw new Error('Workspace mode requires the Vivaldi bridge script. See documentation for installation instructions.');
    }
  }
  
  async applyStackMode() {
    try {
      // Create tab groups (stacks) in the current window
      const currentWindow = await chrome.windows.getCurrent();
      
      for (const [category, tabs] of Object.entries(this.analyzedTabs)) {
        if (tabs.length === 0) continue;
        
        // Move all tabs to current window first
        const tabIds = tabs.map(t => t.id);
        
        // Create a group for this category
        try {
          const groupId = await chrome.tabs.group({
            tabIds: tabIds
          });
          
          // Update group properties
          await chrome.tabGroups.update(groupId, {
            title: category,
            collapsed: false
          });
        } catch (err) {
          console.error(`Error creating group for ${category}:`, err);
        }
      }
    } catch (error) {
      console.error('Error in stack mode:', error);
      throw error;
    }
  }
  
  async applyWindowMode() {
    try {
      // Create separate windows for each category
      for (const [category, tabs] of Object.entries(this.analyzedTabs)) {
        if (tabs.length === 0) continue;
        
        // Create new window with the first tab
        const firstTab = tabs[0];
        const newWindow = await chrome.windows.create({
          tabId: firstTab.id,
          focused: false
        });
        
        // Move remaining tabs to the new window
        if (tabs.length > 1) {
          const remainingTabIds = tabs.slice(1).map(t => t.id);
          await chrome.tabs.move(remainingTabIds, {
            windowId: newWindow.id,
            index: -1
          });
        }
      }
    } catch (error) {
      console.error('Error in window mode:', error);
      throw error;
    }
  }
  
  showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `visible ${type}`;
  }
  
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  // Escape HTML to prevent XSS attacks
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Sanitize error messages to avoid exposing sensitive information
  sanitizeErrorMessage(message) {
    if (!message) return 'An unknown error occurred';
    
    // Remove any potential API keys (Gemini keys start with "AI" followed by 33+ alphanumeric chars)
    let sanitized = message.replace(/AI[a-zA-Z0-9_-]{28,}/g, '[API_KEY]');
    
    // Remove URLs that might contain sensitive query parameters
    sanitized = sanitized.replace(/https?:\/\/[^\s]+\?[^\s]+/g, '[URL]');
    
    // Keep the message user-friendly
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 200) + '...';
    }
    
    return sanitized;
  }
}

// Initialize the tab sorter when popup opens
document.addEventListener('DOMContentLoaded', () => {
  new TabSorter();
});
