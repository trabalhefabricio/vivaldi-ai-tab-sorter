// Popup.js - Main logic for Vivaldi AI Tab Sorter

class TabSorter {
  constructor() {
    this.apiKey = '';
    this.categories = [];
    this.logicRules = '';
    this.removeDuplicates = false;
    this.mode = 'workspaces';
    this.stackScope = 'current'; // 'current' or 'all' - for stack mode options
    this.analyzedTabs = null;
    this.allTabs = [];
    this.selectedModel = 'gemini-1.5-flash'; // Default to stable model
    this.availableModels = []; // Will be populated from API
    
    // Colors available for tab groups in Chrome/Vivaldi
    this.availableColors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan'];
    
    // Rate limiting for free tier (15 RPM, 1500 RPD)
    this.lastRequestTime = 0;
    this.minRequestInterval = 4000; // 4 seconds between requests (15 RPM = 1 request per 4s)
    this.requestCount = 0;
    this.dailyRequestLimit = 1400; // Stay under 1500/day limit
    
    this.init();
  }
  
  async init() {
    // Load saved settings and request tracking
    await this.loadSettings();
    await this.loadRequestTracking();
    
    // Setup event listeners
    this.setupEventListeners();
  }
  
  async loadRequestTracking() {
    try {
      const data = await chrome.storage.local.get(['requestCount', 'lastResetDate']);
      
      // Reset counter if it's a new day
      const today = new Date().toDateString();
      if (data.lastResetDate !== today) {
        this.requestCount = 0;
        await chrome.storage.local.set({
          requestCount: 0,
          lastResetDate: today
        });
      } else {
        this.requestCount = data.requestCount || 0;
      }
    } catch (error) {
      console.error('Error loading request tracking:', error);
      this.requestCount = 0;
    }
  }
  
  async updateRequestTracking() {
    this.requestCount++;
    try {
      await chrome.storage.local.set({
        requestCount: this.requestCount,
        lastResetDate: new Date().toDateString()
      });
    } catch (error) {
      console.error('Error updating request tracking:', error);
    }
  }
  
  async resetRequestCounter() {
    try {
      const oldCount = this.requestCount;
      this.requestCount = 0;
      await chrome.storage.local.set({
        requestCount: 0,
        lastResetDate: new Date().toDateString()
      });
      // Update the usage display to show reset confirmation
      const usageInfoDiv = document.getElementById('usageInfo');
      const usageText = document.getElementById('usageText');
      usageText.innerHTML = `✓ Counter reset from ${oldCount} to 0`;
      this.showStatus(`✓ Request counter reset successfully. You can now make API requests.`, 'success');
      console.log(`Request counter manually reset by user from ${oldCount} to 0`);
      
      // Update the usage display after 3 seconds to show current state
      setTimeout(() => {
        this.updateUsageInfo();
      }, 3000);
    } catch (error) {
      console.error('Error resetting request counter:', error);
      this.showStatus('Error resetting counter. Please try again.', 'error');
    }
  }
  
  async loadSettings() {
    try {
      const data = await chrome.storage.local.get([
        'apiKey', 
        'categories', 
        'logicRules', 
        'removeDuplicates', 
        'mode',
        'stackScope',
        'selectedModel'
      ]);
      
      // Restore settings to UI
      if (data.apiKey) {
        document.getElementById('apiKey').value = data.apiKey;
        this.apiKey = data.apiKey;
      }
      
      if (data.selectedModel) {
        const modelSelect = document.getElementById('modelSelect');
        // Validate that the saved model exists in the dropdown
        const modelExists = Array.from(modelSelect.options).some(opt => opt.value === data.selectedModel);
        if (modelExists) {
          modelSelect.value = data.selectedModel;
          this.selectedModel = data.selectedModel;
        } else {
          // Saved model doesn't exist, use current default
          console.log(`Saved model "${data.selectedModel}" not found in dropdown, using default`);
          this.selectedModel = modelSelect.value;
        }
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
      
      if (data.stackScope) {
        const scopeRadio = document.getElementById(data.stackScope === 'all' ? 'stackAllWindows' : 'stackCurrentWindow');
        if (scopeRadio) scopeRadio.checked = true;
        this.stackScope = data.stackScope;
      }
      
      if (data.mode) {
        const modeRadio = document.getElementById(`mode${this.capitalizeFirst(data.mode)}`);
        if (modeRadio) {
          modeRadio.checked = true;
          this.mode = data.mode;
        }
      }
      
      // Update usage info display
      this.updateUsageInfo();
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  updateUsageInfo() {
    const usageInfoDiv = document.getElementById('usageInfo');
    const usageText = document.getElementById('usageText');
    
    if (this.requestCount > 0) {
      usageInfoDiv.style.display = 'block';
      // Defensive check to prevent division by zero
      const percentUsed = this.dailyRequestLimit > 0 
        ? Math.round((this.requestCount / this.dailyRequestLimit) * 100)
        : 0;
      let color = 'rgba(72, 187, 120, 0.9)'; // green
      
      if (percentUsed > 80) {
        color = 'rgba(245, 101, 101, 0.9)'; // red
      } else if (percentUsed > 60) {
        color = 'rgba(237, 137, 54, 0.9)'; // orange
      }
      
      usageText.innerHTML = `📊 API Usage Today: <span style="color: ${color}; font-weight: bold;">${this.requestCount}/${this.dailyRequestLimit}</span> requests (${percentUsed}%) • Free tier resets daily`;
    } else {
      usageInfoDiv.style.display = 'none';
    }
  }
  
  setupEventListeners() {
    // Save settings on change
    document.getElementById('apiKey').addEventListener('input', (e) => {
      // Trim whitespace from API key to prevent authentication failures with Google's API
      this.apiKey = e.target.value.trim();
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
    
    document.getElementById('modelSelect').addEventListener('change', (e) => {
      this.selectedModel = e.target.value;
      this.saveSettings();
    });
    
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.mode = e.target.value;
          // Show/hide stack options based on mode selection
          const stackOptionsSection = document.getElementById('stackOptionsSection');
          if (stackOptionsSection) {
            stackOptionsSection.style.display = e.target.value === 'stacks' ? 'block' : 'none';
          }
          this.saveSettings();
        }
      });
    });
    
    // Stack scope options
    document.querySelectorAll('input[name="stackScope"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.stackScope = e.target.value;
          this.saveSettings();
        }
      });
    });
    
    // Show/hide stack options on initial load
    const currentMode = document.querySelector('input[name="mode"]:checked');
    const stackOptionsSection = document.getElementById('stackOptionsSection');
    if (currentMode && stackOptionsSection) {
      stackOptionsSection.style.display = currentMode.value === 'stacks' ? 'block' : 'none';
    }
    
    // Action buttons
    document.getElementById('analyzeBtn').addEventListener('click', () => this.analyze());
    document.getElementById('applyBtn').addEventListener('click', () => this.apply());
    
    // Reset counter button
    document.getElementById('resetCounter').addEventListener('click', () => {
      this.resetRequestCounter();
    });
    
    // Refresh models button
    document.getElementById('refreshModelsBtn').addEventListener('click', () => {
      this.fetchAvailableModels();
    });
  }
  
  async fetchAvailableModels() {
    if (!this.apiKey || !this.apiKey.trim()) {
      this.showStatus('Please enter your API key first to fetch available models', 'error');
      return;
    }
    
    try {
      this.showStatus('Fetching available models from Google...', 'info');
      document.getElementById('refreshModelsBtn').disabled = true;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Filter for generative models that support generateContent
      const generativeModels = data.models?.filter(model => 
        model.supportedGenerationMethods?.includes('generateContent') &&
        model.name.includes('gemini')
      ) || [];
      
      if (generativeModels.length === 0) {
        this.showStatus('No compatible models found', 'error');
        return;
      }
      
      // Update dropdown with fetched models
      const modelSelect = document.getElementById('modelSelect');
      const currentValue = modelSelect.value;
      modelSelect.innerHTML = '';
      
      generativeModels.forEach(model => {
        const modelName = model.name.replace('models/', '');
        const option = document.createElement('option');
        option.value = modelName;
        
        // Add helpful descriptions based on model name
        let description = '';
        if (modelName.includes('flash')) {
          description = ' (Fast & High Quota)';
        } else if (modelName.includes('pro')) {
          description = ' (More Capable)';
        } else if (modelName.includes('exp')) {
          description = ' (Experimental)';
        }
        
        option.textContent = modelName + description;
        modelSelect.appendChild(option);
      });
      
      // Restore previous selection if it exists in the new list
      if (currentValue && Array.from(modelSelect.options).some(opt => opt.value === currentValue)) {
        modelSelect.value = currentValue;
      } else if (generativeModels.length > 0) {
        // Default to first model if previous selection not found
        const firstModelName = generativeModels[0].name.replace('models/', '');
        modelSelect.value = firstModelName;
        this.selectedModel = firstModelName;
        this.saveSettings();
      }
      
      this.availableModels = generativeModels;
      this.showStatus(`✓ Found ${generativeModels.length} compatible models`, 'success');
      console.log('Available models:', generativeModels.map(m => m.name));
      
    } catch (error) {
      console.error('Error fetching models:', error);
      this.showStatus(`Error fetching models: ${error.message}`, 'error');
    } finally {
      document.getElementById('refreshModelsBtn').disabled = false;
    }
  }
  
  async saveSettings() {
    try {
      await chrome.storage.local.set({
        apiKey: this.apiKey,
        categories: this.categories.join(', '),
        logicRules: this.logicRules,
        removeDuplicates: this.removeDuplicates,
        mode: this.mode,
        stackScope: this.stackScope,
        selectedModel: this.selectedModel
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
      
      // Check daily request limit for free tier
      if (this.requestCount >= this.dailyRequestLimit) {
        console.warn(`Local request counter at ${this.requestCount}/${this.dailyRequestLimit}. Blocking request.`);
        this.showStatus(`⚠️ Local daily limit reached (${this.requestCount}/${this.dailyRequestLimit} requests). This is the extension's tracker, not Google's limit. Click "Reset Counter" below if this seems wrong, or wait until tomorrow for automatic reset.`, 'error');
        document.getElementById('analyzeBtn').disabled = false;
        // Make sure usage info is visible so user can see reset button
        this.updateUsageInfo();
        return;
      }
      
      // Check time since last request (rate limiting)
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestInterval && this.lastRequestTime > 0) {
        const waitTime = Math.ceil((this.minRequestInterval - timeSinceLastRequest) / 1000);
        this.showStatus(`⏳ Rate limiting: Please wait ${waitTime}s before making another request (free tier: 15 requests/minute max)`, 'info');
        
        // Wait and then proceed
        await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
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
      
      // Estimate token usage and warn if large
      const estimatedTokens = this.estimateTokens(this.allTabs);
      if (estimatedTokens > 100000) {
        this.showStatus(`⚠️ Large request (~${Math.round(estimatedTokens / 1000)}k tokens). Consider closing some tabs. Free tier limit: 1M tokens/minute.`, 'info');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Give user time to read
      }
      
      this.showStatus(`Found ${this.allTabs.length} tabs. Analyzing with AI... (Request ${this.requestCount + 1}/${this.dailyRequestLimit} today)`, 'info');
      
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
      
      // Update usage info
      this.updateUsageInfo();
      
      this.showStatus('Analysis complete! Review the preview and click "Apply Sorting"', 'success');
      
    } catch (error) {
      console.error('Error analyzing tabs:', error);
      // Sanitize error message to avoid exposing sensitive information like API keys
      const sanitizedMessage = this.sanitizeErrorMessage(error.message);
      this.showStatus(`Error: ${sanitizedMessage}`, 'error');
      document.getElementById('analyzeBtn').disabled = false;
    }
  }
  
  // Estimate token usage for a tab list (rough estimation)
  estimateTokens(tabs) {
    // Rough estimation: ~4 chars per token
    // Title + URL + JSON structure overhead
    let totalChars = 0;
    tabs.forEach(tab => {
      totalChars += (tab.title?.length || 0) + (tab.url?.length || 0) + 50; // 50 for JSON overhead
    });
    
    // Add prompt overhead (~500 tokens)
    const promptOverhead = 2000; // chars
    totalChars += promptOverhead;
    
    // Convert to tokens (rough: 4 chars = 1 token)
    return Math.ceil(totalChars / 4);
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
      
      // Call Gemini API with retry logic for rate limiting
      const maxRetries = 2;
      let lastError = null;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // Add delay for retries (exponential backoff with longer waits for rate limits)
          if (attempt > 0) {
            // For rate limit retries, wait at least 60 seconds (Google's free tier resets per minute)
            const baseDelayMs = 60000; // 60 seconds
            const delayMs = baseDelayMs * attempt; // 60s, 120s
            this.showStatus(`Google API rate limit hit. Waiting ${delayMs / 1000}s before retry... (attempt ${attempt + 1}/${maxRetries + 1})`, 'info');
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          
          // Track request time for rate limiting
          this.lastRequestTime = Date.now();
          
          console.log(`Making Gemini API request (attempt ${attempt + 1}/${maxRetries + 1}), local counter at ${this.requestCount}/${this.dailyRequestLimit}, model: ${this.selectedModel}`);
          
          // Use the user-selected model
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.selectedModel}:generateContent?key=${this.apiKey}`, {
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
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || response.statusText;
            
            console.error(`Gemini API error (status ${response.status}):`, errorMessage);
            
            // Check for rate limit errors (429 or quota messages)
            if (response.status === 429 || errorMessage.toLowerCase().includes('quota') || 
                errorMessage.toLowerCase().includes('rate limit')) {
              
              // Create a more specific error message
              const isQuotaError = errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('exceeded');
              let specificMessage;
              
              if (isQuotaError) {
                specificMessage = `Google API quota exceeded. Free tier limits: 15 requests/min, 1,500 requests/day, 1M tokens/min. `;
                specificMessage += `This error comes directly from Google's servers, not the extension. `;
                specificMessage += `If you just created the API key, wait 1-2 minutes for activation. `;
                specificMessage += `Otherwise, you may have hit the daily limit - try again tomorrow or check your usage at https://aistudio.google.com/`;
              } else {
                specificMessage = `Google API rate limit hit (too many requests too quickly). Wait 60 seconds and try again.`;
              }
              
              lastError = new Error(specificMessage);
              
              // Retry on rate limit errors, but not on quota errors (those won't recover quickly)
              if (attempt < maxRetries && !isQuotaError) {
                continue;
              } else if (isQuotaError) {
                // Don't retry quota errors - they won't recover in minutes
                break;
              }
            } else {
              // For non-rate-limit errors, throw immediately
              throw new Error(`Gemini API error: ${errorMessage}`);
            }
          } else {
            // Success - parse and return the response
            const data = await response.json();
            const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!resultText) {
              throw new Error('No response from Gemini API');
            }
            
            // Parse the JSON response
            const categorizedTabs = this.parseGeminiResponse(resultText, tabs);
            
            // Only increment request counter on successful API call
            console.log(`Gemini API request successful. Incrementing counter from ${this.requestCount} to ${this.requestCount + 1}`);
            await this.updateRequestTracking();
            
            return categorizedTabs;
          }
        } catch (error) {
          // If it's a fetch error (network issue), save it and potentially retry
          if (error.message.includes('fetch') || error.message.includes('network')) {
            lastError = error;
            if (attempt < maxRetries) {
              continue;
            }
          }
          // For other errors, throw immediately
          throw error;
        }
      }
      
      // If we exhausted all retries, throw the last error
      throw lastError || new Error('Failed to analyze tabs after multiple attempts');
      
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
      console.log('Parsing Gemini response, length:', responseText.length);
      
      let jsonText = null;
      let categorizations = null;
      
      // Strategy 1: Try to extract JSON from markdown code blocks
      // Look for ```json or just ``` followed by JSON array
      const markdownMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (markdownMatch) {
        console.log('Found JSON in markdown code block');
        jsonText = markdownMatch[1];
      }
      
      // Strategy 2: Try to find a JSON array using regex (greedy to capture full array)
      // But first, check if response contains markdown - if so, try to strip it
      if (!jsonText) {
        let cleanedResponse = responseText;
        
        // If response contains markdown indicators, try to extract just the content
        if (responseText.includes('```')) {
          // Try to extract content between backticks even if regex didn't match
          const backtickParts = responseText.split('```');
          if (backtickParts.length >= 3) {
            // Take the middle part (between first and second ```)
            cleanedResponse = backtickParts[1]
              .replace(/^json\s*/i, '') // Remove 'json' language identifier
              .trim();
            console.log('Extracted content from markdown code block');
          }
        }
        
        const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          console.log('Found JSON array using regex');
          jsonText = jsonMatch[0];
        }
      }
      
      // Strategy 3: Try to parse the entire response as JSON
      if (!jsonText) {
        console.log('Attempting to parse entire response as JSON');
        jsonText = responseText.trim();
      }
      
      // Throw descriptive error if no JSON found
      if (!jsonText) {
        console.error('Could not extract JSON from response. Response:', responseText.substring(0, 500));
        throw new Error('Could not find JSON array in AI response. The response may be empty or malformed.');
      }
      
      // Try to parse the JSON
      try {
        categorizations = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Failed to parse JSON:', jsonText.substring(0, 500));
        throw new Error(`Invalid JSON format in AI response: ${parseError.message}. Try analyzing fewer tabs or check your API key.`);
      }
      
      // Validate that we got an array
      if (!Array.isArray(categorizations)) {
        console.error('Response is not an array:', typeof categorizations);
        throw new Error('AI response is not a JSON array. Expected format: [{"id": ..., "category": "..."}]');
      }
      
      // Validate array has items
      if (categorizations.length === 0) {
        console.warn('AI returned empty array');
        throw new Error('AI returned an empty categorization list. Try rephrasing your categories or logic rules.');
      }
      
      // Validate items have required structure
      const validItems = categorizations.filter(item => item && typeof item.id !== 'undefined' && item.category);
      if (validItems.length === 0) {
        console.error('No valid categorization items found. Sample:', categorizations[0]);
        throw new Error('AI response items are missing "id" or "category" fields. Expected format: [{"id": ..., "category": "..."}]');
      }
      
      console.log(`Successfully parsed ${validItems.length} categorizations out of ${categorizations.length} items`);
      
      // Create a map of categorized tabs
      const categorizedTabs = {};
      this.categories.forEach(cat => {
        categorizedTabs[cat] = [];
      });
      
      // Add an "Uncategorized" category for any tabs not assigned
      categorizedTabs['Uncategorized'] = [];
      
      // Map categorizations back to original tabs
      const categorizationMap = new Map();
      validItems.forEach(item => {
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
      // Re-throw with original message if it's already descriptive
      if (error.message.includes('AI response') || error.message.includes('JSON')) {
        throw error;
      }
      // Otherwise, wrap with generic message
      throw new Error(`Failed to parse AI response: ${error.message}. Please try again.`);
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
  
  async testBridgeConnection() {
    // Test if the Vivaldi bridge script is responding
    try {
      console.log('Testing bridge connection...');
      
      await chrome.storage.local.set({
        workspaceCommand: {
          action: 'test',
          timestamp: Date.now()
        }
      });
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = await chrome.storage.local.get('workspaceCommandResult');
      
      if (result.workspaceCommandResult && 
          result.workspaceCommandResult.timestamp > Date.now() - 5000) {
        await chrome.storage.local.remove(['workspaceCommand', 'workspaceCommandResult']);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error testing bridge:', error);
      return false;
    }
  }
  
  async applyWorkspaceMode() {
    // Send message to background script to handle workspace creation
    // Now supports both Chrome Extensions API (no bridge required) and bridge fallback
    try {
      console.log('Requesting workspace organization...');
      
      const response = await chrome.runtime.sendMessage({
        action: 'organizeToWorkspaces',
        categorizedTabs: this.analyzedTabs
      });
      
      if (!response || !response.success) {
        const errorMsg = response?.error || 'Failed to organize tabs into workspaces';
        console.error('Workspace organization failed:', errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('Workspace organization successful via', response.method || 'unknown method');
      
      // Show helpful message about which method was used
      if (response.method === 'extensionsAPI') {
        console.log('✓ Organized using Chrome Extensions API (no bridge required)');
        console.log(response.message || `Created ${response.windowsCreated || 0} workspace windows`);
      } else if (response.method === 'bridge') {
        console.log('✓ Organized using Vivaldi bridge script');
      }
      
    } catch (error) {
      console.error('Error in workspace mode:', error);
      
      // Provide a more helpful error message
      const errorMessage = error.message.includes('bridge') 
        ? `❌ ${error.message}\n\nNote: The extension now uses Chrome Extensions API by default, which works without the bridge script.`
        : `❌ Workspace mode error: ${error.message}`;
      
      throw new Error(errorMessage);
    }
  }
  
  async applyStackMode() {
    try {
      console.log(`Stack mode: scope=${this.stackScope}`);
      console.log('Analyzed tabs:', Object.keys(this.analyzedTabs).map(cat => `${cat}: ${this.analyzedTabs[cat].length} tabs`).join(', '));
      
      let targetWindowId;
      let allTabsToOrganize = [];
      
      if (this.stackScope === 'all') {
        // Consolidate all windows: get all tabs from all windows
        console.log('Consolidating tabs from all windows into one window...');
        const allWindows = await chrome.windows.getAll({ populate: true });
        
        // Validate we have at least one window
        if (!allWindows || allWindows.length === 0) {
          throw new Error('No windows found. Cannot consolidate tabs.');
        }
        
        // Create or use a window for consolidation
        targetWindowId = allWindows[0].id;
        
        // First, move all tabs to the target window
        const movedTabIds = new Set();
        for (const [category, tabs] of Object.entries(this.analyzedTabs)) {
          if (tabs.length === 0) continue;
          
          // Move tabs from other windows to the target window first
          for (const tab of tabs) {
            if (tab.windowId !== targetWindowId) {
              try {
                await chrome.tabs.move(tab.id, {
                  windowId: targetWindowId,
                  index: -1
                });
                movedTabIds.add(tab.id);
              } catch (err) {
                console.error(`Error moving tab ${tab.id} to target window:`, err);
              }
            }
          }
        }
        
        // Re-query tabs in the target window to get updated tab objects
        const updatedTabs = await chrome.tabs.query({ windowId: targetWindowId });
        const tabMap = new Map(updatedTabs.map(t => [t.id, t]));
        
        // Now organize tabs with updated tab objects
        for (const [category, tabs] of Object.entries(this.analyzedTabs)) {
          if (tabs.length === 0) continue;
          
          // Get updated tab objects for this category
          const updatedCategoryTabs = tabs
            .map(t => tabMap.get(t.id))
            .filter(t => t !== undefined);
          
          if (updatedCategoryTabs.length > 0) {
            allTabsToOrganize.push({ category, tabs: updatedCategoryTabs });
          }
        }
      } else {
        // Current window only
        const currentWindow = await chrome.windows.getCurrent();
        targetWindowId = currentWindow.id;
        
        for (const [category, tabs] of Object.entries(this.analyzedTabs)) {
          if (tabs.length === 0) continue;
          // Only include tabs from current window
          const tabsInCurrentWindow = tabs.filter(t => t.windowId === currentWindow.id);
          if (tabsInCurrentWindow.length > 0) {
            allTabsToOrganize.push({ category, tabs: tabsInCurrentWindow });
          }
        }
      }
      
      // Now create colored groups with names for each category
      let colorIndex = 0;
      let groupsCreated = 0;
      let groupsFailed = 0;
      
      console.log(`Attempting to create ${allTabsToOrganize.length} tab groups...`);
      
      if (allTabsToOrganize.length === 0) {
        console.warn('No tabs to organize! allTabsToOrganize is empty.');
        throw new Error('No tabs to organize. This could mean all tabs were filtered out or the analysis data was lost.');
      }
      
      for (const { category, tabs } of allTabsToOrganize) {
        if (tabs.length === 0) continue;
        
        const tabIds = tabs.map(t => t.id);
        const color = this.availableColors[colorIndex % this.availableColors.length];
        
        console.log(`Creating group "${category}" with color ${color} and ${tabIds.length} tabs (IDs: ${tabIds.join(', ')})`);
        
        // Verify tabs still exist before grouping
        try {
          const validTabIds = [];
          for (const tabId of tabIds) {
            try {
              const tab = await chrome.tabs.get(tabId);
              if (tab) {
                validTabIds.push(tabId);
              }
            } catch (err) {
              console.warn(`Tab ${tabId} no longer exists, skipping`);
            }
          }
          
          if (validTabIds.length === 0) {
            console.warn(`No valid tabs found for category "${category}", skipping`);
            continue;
          }
          
          console.log(`  -> Verified ${validTabIds.length}/${tabIds.length} tabs still exist`);
          
          const groupId = await chrome.tabs.group({
            tabIds: validTabIds
          });
          
          console.log(`  -> Group created with ID: ${groupId}`);
          
          // Update group with color and category name
          await chrome.tabGroups.update(groupId, {
            title: category,
            color: color,
            collapsed: false
          });
          
          console.log(`  -> Group updated with title "${category}" and color ${color}`);
          
          colorIndex++;
          groupsCreated++;
        } catch (err) {
          console.error(`Error creating group for ${category}:`, err);
          console.error(`  -> Tab IDs that failed:`, tabIds);
          console.error(`  -> Error details:`, err.message, err.stack);
          groupsFailed++;
        }
      }
      
      // Focus the target window
      if (targetWindowId) {
        await chrome.windows.update(targetWindowId, { focused: true });
      }
      
      console.log(`✓ Created ${groupsCreated} colored tab stacks (${groupsFailed} failed)`);
      
      if (groupsCreated === 0 && allTabsToOrganize.length > 0) {
        throw new Error(`Failed to create any tab groups. Attempted ${allTabsToOrganize.length} groups, all failed. Check the browser console for details.`);
      }
      
      
    } catch (error) {
      console.error('Error in stack mode:', error);
      throw error;
    }
  }
  
  async applyWindowMode() {
    try {
      // Create separate windows for each category
      // Each window will have tabs grouped with the category name as the group title
      let colorIndex = 0;
      let windowsCreated = 0;
      
      for (const [category, tabs] of Object.entries(this.analyzedTabs)) {
        if (tabs.length === 0) continue;
        
        console.log(`Creating window for category "${category}" with ${tabs.length} tabs`);
        
        // Create new window with the first tab
        const firstTab = tabs[0];
        const newWindow = await chrome.windows.create({
          tabId: firstTab.id,
          focused: false
        });
        
        // Move remaining tabs to the new window
        if (tabs.length > 1) {
          const remainingTabIds = tabs.slice(1).map(t => t.id);
          try {
            await chrome.tabs.move(remainingTabIds, {
              windowId: newWindow.id,
              index: -1
            });
          } catch (moveError) {
            console.error(`Error moving tabs to window ${newWindow.id}:`, moveError);
            // Continue anyway - some tabs might have moved successfully
          }
        }
        
        // Get all tabs in the new window (they've been moved)
        const windowTabs = await chrome.tabs.query({ windowId: newWindow.id });
        const tabIds = windowTabs.map(t => t.id);
        
        // Group all tabs together with the category name and color
        // Only group if we have tabs and colors available
        if (tabIds.length > 0 && this.availableColors && this.availableColors.length > 0) {
          try {
            const color = this.availableColors[colorIndex % this.availableColors.length];
            const groupId = await chrome.tabs.group({
              tabIds: tabIds
            });
            
            // Update group with color and category name as title
            await chrome.tabGroups.update(groupId, {
              title: category,
              color: color,
              collapsed: false
            });
            
            console.log(`✓ Created group "${category}" with color ${color} in window ${newWindow.id}`);
            colorIndex++;
          } catch (err) {
            console.error(`Error creating group for ${category}:`, err);
          }
        }
        
        windowsCreated++;
      }
      
      console.log(`✓ Created ${windowsCreated} windows with grouped tabs`);
      
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
