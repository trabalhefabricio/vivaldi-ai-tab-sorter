// Error Collector for Vivaldi AI Tab Sorter
// This module captures and logs all errors during runtime for debugging

class ErrorCollector {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.maxErrors = 100; // Limit stored errors to prevent memory issues
    this.sessionId = this.generateSessionId();
    this.saveDebounceTimer = null;
    this.saveDebounceDelay = 1000; // Wait 1 second before saving to reduce storage operations
    this.init();
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  init() {
    // Capture console errors
    this.setupErrorHandlers();
    
    // Load previous errors from storage
    this.loadStoredErrors();
    
    console.log(`[ErrorCollector] Initialized with session ID: ${this.sessionId}`);
  }

  setupErrorHandlers() {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.logError('Unhandled Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack || event.error?.toString()
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('Unhandled Promise Rejection', {
        reason: event.reason?.toString() || 'Unknown reason',
        promise: event.promise,
        stack: event.reason?.stack
      });
    });

    // Wrap console methods to capture logs
    this.wrapConsole();
  }

  wrapConsole() {
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    console.error = (...args) => {
      this.logError('Console Error', { args: args.map(a => this.stringify(a)) });
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      this.logWarning('Console Warning', { args: args.map(a => this.stringify(a)) });
      originalWarn.apply(console, args);
    };

    // Optional: capture info logs too
    console.log = (...args) => {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('[ERROR]')) {
        this.logError('Console Log Error', { args: args.map(a => this.stringify(a)) });
      }
      originalLog.apply(console, args);
    };
  }

  stringify(obj) {
    try {
      if (obj instanceof Error) {
        return {
          name: obj.name,
          message: obj.message,
          stack: obj.stack
        };
      }
      if (typeof obj === 'object') {
        return JSON.stringify(obj, null, 2);
      }
      return String(obj);
    } catch (e) {
      return '[Unable to stringify object]';
    }
  }

  logError(type, details) {
    const errorEntry = {
      type,
      details,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.errors.push(errorEntry);
    
    // Limit stored errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Save to storage
    this.saveErrors();

    // Also log to console with special marker for easy filtering
    console.error('[ERROR_COLLECTOR]', type, details);
  }

  logWarning(type, details) {
    const warningEntry = {
      type,
      details,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };

    this.warnings.push(warningEntry);
    
    if (this.warnings.length > this.maxErrors) {
      this.warnings.shift();
    }

    this.saveErrors();
  }

  logInfo(type, details) {
    const infoEntry = {
      type,
      details,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };

    this.info.push(infoEntry);
    
    if (this.info.length > this.maxErrors) {
      this.info.shift();
    }
  }

  async saveErrors() {
    // Debounce saves to reduce storage operations
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    
    this.saveDebounceTimer = setTimeout(async () => {
      try {
        await chrome.storage.local.set({
          collectedErrors: this.errors,
          collectedWarnings: this.warnings,
          lastErrorUpdate: new Date().toISOString()
        });
      } catch (e) {
        console.error('Failed to save errors to storage:', e);
      }
    }, this.saveDebounceDelay);
  }

  async loadStoredErrors() {
    try {
      const data = await chrome.storage.local.get(['collectedErrors', 'collectedWarnings']);
      if (data.collectedErrors) {
        this.errors = data.collectedErrors.slice(-this.maxErrors);
      }
      if (data.collectedWarnings) {
        this.warnings = data.collectedWarnings.slice(-this.maxErrors);
      }
    } catch (e) {
      console.error('Failed to load stored errors:', e);
    }
  }

  getAllErrors() {
    return {
      errors: this.errors,
      warnings: this.warnings,
      info: this.info,
      sessionId: this.sessionId,
      count: {
        errors: this.errors.length,
        warnings: this.warnings.length,
        info: this.info.length
      }
    };
  }

  getErrorReport() {
    const report = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length,
        totalInfo: this.info.length
      },
      errors: this.errors,
      warnings: this.warnings,
      systemInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        url: window.location.href
      }
    };

    return report;
  }

  getFormattedReport() {
    const report = this.getErrorReport();
    return JSON.stringify(report, null, 2);
  }

  downloadReport() {
    const report = this.getFormattedReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vivaldi-tab-sorter-errors-${this.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  clear() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.saveErrors();
    console.log('[ErrorCollector] Cleared all errors');
  }

  // Helper to log API errors
  logAPIError(apiName, request, response, error) {
    this.logError('API Error', {
      api: apiName,
      request: this.stringify(request),
      response: this.stringify(response),
      error: this.stringify(error),
      timestamp: new Date().toISOString()
    });
  }

  // Helper to log validation errors
  logValidationError(field, value, expectedFormat) {
    this.logError('Validation Error', {
      field,
      value: this.stringify(value),
      expectedFormat,
      timestamp: new Date().toISOString()
    });
  }

  // Helper to log storage errors
  logStorageError(operation, key, error) {
    this.logError('Storage Error', {
      operation,
      key,
      error: this.stringify(error),
      timestamp: new Date().toISOString()
    });
  }
}

// Create global instance
window.errorCollector = new ErrorCollector();
