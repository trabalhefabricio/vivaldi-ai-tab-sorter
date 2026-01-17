#!/usr/bin/env node

/**
 * Vivaldi AI Tab Sorter - Comprehensive Diagnostic Tool
 * 
 * This standalone diagnostic tool runs separately from the extension
 * to provide thorough health checks and troubleshooting information.
 * 
 * Usage:
 *   node diagnostic.js              # Run all diagnostics
 *   node diagnostic.js --quick      # Run quick checks only
 *   node diagnostic.js --output json # Output in JSON format
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

class DiagnosticTool {
  constructor(options = {}) {
    this.quick = options.quick || false;
    this.outputFormat = options.outputFormat || 'text';
    this.results = {
      timestamp: new Date().toISOString(),
      summary: { passed: 0, warnings: 0, failed: 0 },
      checks: []
    };
    this.extensionDir = process.cwd();
  }

  // Utility to add a check result
  addCheck(name, status, message, details = {}) {
    this.results.checks.push({
      name,
      status, // 'pass', 'warn', 'fail'
      message,
      details
    });
    
    if (status === 'pass') this.results.summary.passed++;
    else if (status === 'warn') this.results.summary.warnings++;
    else if (status === 'fail') this.results.summary.failed++;
  }

  // Check if file exists
  checkFileExists(filePath, required = true) {
    const fullPath = path.join(this.extensionDir, filePath);
    const exists = fs.existsSync(fullPath);
    
    if (exists) {
      const stats = fs.statSync(fullPath);
      this.addCheck(
        `File: ${filePath}`,
        'pass',
        `File exists (${stats.size} bytes)`,
        { path: fullPath, size: stats.size }
      );
      return true;
    } else {
      this.addCheck(
        `File: ${filePath}`,
        required ? 'fail' : 'warn',
        required ? 'Required file missing' : 'Optional file missing',
        { path: fullPath }
      );
      return false;
    }
  }

  // Check Node.js environment
  checkEnvironment() {
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (major >= 14) {
      this.addCheck(
        'Node.js Version',
        'pass',
        `Node.js ${nodeVersion} is compatible`,
        { version: nodeVersion, major }
      );
    } else if (major >= 12) {
      this.addCheck(
        'Node.js Version',
        'warn',
        `Node.js ${nodeVersion} may have compatibility issues`,
        { version: nodeVersion, major }
      );
    } else {
      this.addCheck(
        'Node.js Version',
        'fail',
        `Node.js ${nodeVersion} is too old (need 14+)`,
        { version: nodeVersion, major }
      );
    }
  }

  // Check all required files
  checkRequiredFiles() {
    const requiredFiles = [
      'manifest.json',
      'popup.html',
      'popup.js',
      'background.js',
      'ai_bridge.js',
      'icons/icon16.png',
      'icons/icon48.png',
      'icons/icon128.png'
    ];

    const documentationFiles = [
      'README.md',
      'DOCUMENTATION.md',
      'INSTALL.md',
      'TROUBLESHOOTING.md',
      'LICENSE'
    ];

    let allFilesPresent = true;
    
    for (const file of requiredFiles) {
      if (!this.checkFileExists(file, true)) {
        allFilesPresent = false;
      }
    }

    for (const file of documentationFiles) {
      this.checkFileExists(file, false);
    }

    return allFilesPresent;
  }

  // Validate manifest.json
  validateManifest() {
    const manifestPath = path.join(this.extensionDir, 'manifest.json');
    
    try {
      const content = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(content);
      
      // Check manifest version
      if (manifest.manifest_version === 3) {
        this.addCheck(
          'Manifest Version',
          'pass',
          'Using Manifest V3',
          { version: manifest.manifest_version }
        );
      } else {
        this.addCheck(
          'Manifest Version',
          'fail',
          `Using Manifest V${manifest.manifest_version}, should be V3`,
          { version: manifest.manifest_version }
        );
      }

      // Check required permissions
      const requiredPermissions = ['tabs', 'storage', 'tabGroups'];
      const missingPermissions = requiredPermissions.filter(
        p => !manifest.permissions || !manifest.permissions.includes(p)
      );

      if (missingPermissions.length === 0) {
        this.addCheck(
          'Manifest Permissions',
          'pass',
          'All required permissions present',
          { permissions: manifest.permissions }
        );
      } else {
        this.addCheck(
          'Manifest Permissions',
          'fail',
          `Missing permissions: ${missingPermissions.join(', ')}`,
          { missing: missingPermissions, current: manifest.permissions }
        );
      }

      // Check host permissions
      if (manifest.host_permissions && manifest.host_permissions.includes('<all_urls>')) {
        this.addCheck(
          'Host Permissions',
          'pass',
          'Extension can access all URLs',
          { host_permissions: manifest.host_permissions }
        );
      } else {
        this.addCheck(
          'Host Permissions',
          'warn',
          'Extension may have limited URL access',
          { host_permissions: manifest.host_permissions }
        );
      }

      // Check extension metadata
      if (manifest.name && manifest.version && manifest.description) {
        this.addCheck(
          'Extension Metadata',
          'pass',
          `${manifest.name} v${manifest.version}`,
          { 
            name: manifest.name, 
            version: manifest.version,
            description: manifest.description 
          }
        );
      } else {
        this.addCheck(
          'Extension Metadata',
          'warn',
          'Some metadata fields missing',
          { name: manifest.name, version: manifest.version }
        );
      }

    } catch (error) {
      this.addCheck(
        'Manifest Validation',
        'fail',
        `Error reading/parsing manifest.json: ${error.message}`,
        { error: error.message }
      );
    }
  }

  // Validate JavaScript syntax
  validateJavaScript() {
    const jsFiles = ['popup.js', 'background.js', 'ai_bridge.js'];
    
    for (const file of jsFiles) {
      const filePath = path.join(this.extensionDir, file);
      
      if (!fs.existsSync(filePath)) {
        continue; // Already reported as missing
      }

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Basic syntax check - look for common issues
        const issues = [];
        
        // Check for console.log (might want to remove in production)
        const consoleLogCount = (content.match(/console\.log/g) || []).length;
        if (consoleLogCount > 20) {
          issues.push(`Many console.log statements (${consoleLogCount})`);
        }

        // Check file size
        const sizeKB = (content.length / 1024).toFixed(2);
        if (content.length > 100000) {
          issues.push(`Large file size (${sizeKB}KB)`);
        }

        // Check for TODO/FIXME comments
        const todoCount = (content.match(/\/\/\s*(TODO|FIXME)/gi) || []).length;
        if (todoCount > 0) {
          issues.push(`${todoCount} TODO/FIXME comments`);
        }

        if (issues.length === 0) {
          this.addCheck(
            `JavaScript: ${file}`,
            'pass',
            `Syntax appears valid (${sizeKB}KB)`,
            { size: sizeKB, lines: content.split('\n').length }
          );
        } else {
          this.addCheck(
            `JavaScript: ${file}`,
            'warn',
            `File has potential issues: ${issues.join(', ')}`,
            { issues, size: sizeKB }
          );
        }

      } catch (error) {
        this.addCheck(
          `JavaScript: ${file}`,
          'fail',
          `Error reading file: ${error.message}`,
          { error: error.message }
        );
      }
    }
  }

  // Test API connectivity
  async testAPIConnectivity() {
    return new Promise((resolve) => {
      const options = {
        hostname: 'generativelanguage.googleapis.com',
        port: 443,
        path: '/v1beta/models',
        method: 'GET',
        timeout: 5000
      };

      const req = https.request(options, (res) => {
        if (res.statusCode === 200 || res.statusCode === 401 || res.statusCode === 403) {
          // 401/403 means API is reachable but needs auth - that's good enough
          this.addCheck(
            'Gemini API Connectivity',
            'pass',
            'API endpoint is reachable',
            { statusCode: res.statusCode }
          );
        } else {
          this.addCheck(
            'Gemini API Connectivity',
            'warn',
            `Unexpected status code: ${res.statusCode}`,
            { statusCode: res.statusCode }
          );
        }
        resolve();
      });

      req.on('error', (error) => {
        this.addCheck(
          'Gemini API Connectivity',
          'fail',
          `Cannot reach API: ${error.message}`,
          { error: error.message }
        );
        resolve();
      });

      req.on('timeout', () => {
        req.destroy();
        this.addCheck(
          'Gemini API Connectivity',
          'fail',
          'Connection timeout (check internet connection)',
          { timeout: options.timeout }
        );
        resolve();
      });

      req.end();
    });
  }

  // Check bridge script
  checkBridgeScript() {
    const bridgePath = path.join(this.extensionDir, 'ai_bridge.js');
    
    if (!fs.existsSync(bridgePath)) {
      return; // Already reported as missing
    }

    try {
      const content = fs.readFileSync(bridgePath, 'utf8');
      
      // Check for required APIs
      const requiredAPIs = [
        'vivaldi.workspaces',
        'chrome.storage',
        'workspaceCommand'
      ];

      const missingAPIs = requiredAPIs.filter(api => !content.includes(api));

      if (missingAPIs.length === 0) {
        this.addCheck(
          'Bridge Script APIs',
          'pass',
          'All required APIs referenced',
          { apis: requiredAPIs }
        );
      } else {
        this.addCheck(
          'Bridge Script APIs',
          'warn',
          `Missing API references: ${missingAPIs.join(', ')}`,
          { missing: missingAPIs }
        );
      }

      // Check for installation instructions
      if (content.includes('Installation:')) {
        this.addCheck(
          'Bridge Script Documentation',
          'pass',
          'Installation instructions included',
          {}
        );
      } else {
        this.addCheck(
          'Bridge Script Documentation',
          'warn',
          'Installation instructions not found in script',
          {}
        );
      }

      // Check for workspace organization function
      if (content.includes('organizeTabsToWorkspaces')) {
        this.addCheck(
          'Bridge Script Functionality',
          'pass',
          'Workspace organization function present',
          {}
        );
      } else {
        this.addCheck(
          'Bridge Script Functionality',
          'fail',
          'Workspace organization function missing',
          {}
        );
      }

    } catch (error) {
      this.addCheck(
        'Bridge Script Validation',
        'fail',
        `Error reading bridge script: ${error.message}`,
        { error: error.message }
      );
    }
  }

  // Check feature implementations
  checkFeatureImplementations() {
    const popupPath = path.join(this.extensionDir, 'popup.js');
    
    if (!fs.existsSync(popupPath)) {
      return;
    }

    try {
      const content = fs.readFileSync(popupPath, 'utf8');
      
      // Check for core features
      const features = {
        'AI Analysis': ['analyzeTabsWithGemini', 'buildGeminiPrompt'],
        'Tab Categorization': ['parseGeminiResponse', 'categorizedTabs'],
        'Duplicate Removal': ['removeDuplicates', 'url'],
        'Workspace Mode': ['applyWorkspaceMode', 'organizeToWorkspaces'],
        'Tab Stacks Mode': ['applyStackMode', 'chrome.tabGroups'],
        'Windows Mode': ['applyWindowMode', 'chrome.windows.create'],
        'Settings Persistence': ['loadSettings', 'saveSettings', 'chrome.storage'],
        'API Rate Limiting': ['requestCount', 'dailyRequestLimit'],
        'Logic Rules': ['logicRules', 'buildGeminiPrompt'],
        'Model Selection': ['selectedModel', 'modelSelect']
      };

      let allFeaturesPresent = true;

      for (const [featureName, keywords] of Object.entries(features)) {
        const missingKeywords = keywords.filter(kw => !content.includes(kw));
        
        if (missingKeywords.length === 0) {
          this.addCheck(
            `Feature: ${featureName}`,
            'pass',
            'Implementation detected',
            { keywords }
          );
        } else {
          this.addCheck(
            `Feature: ${featureName}`,
            'fail',
            `Missing implementation: ${missingKeywords.join(', ')}`,
            { missing: missingKeywords }
          );
          allFeaturesPresent = false;
        }
      }

      // Overall feature check
      if (allFeaturesPresent) {
        this.addCheck(
          'Core Features',
          'pass',
          `All ${Object.keys(features).length} core features implemented`,
          { count: Object.keys(features).length }
        );
      }

    } catch (error) {
      this.addCheck(
        'Feature Implementation Check',
        'fail',
        `Error reading popup.js: ${error.message}`,
        { error: error.message }
      );
    }
  }

  // Check background service worker
  checkBackgroundWorker() {
    const bgPath = path.join(this.extensionDir, 'background.js');
    
    if (!fs.existsSync(bgPath)) {
      return;
    }

    try {
      const content = fs.readFileSync(bgPath, 'utf8');
      
      // Check for message listener
      if (content.includes('chrome.runtime.onMessage.addListener')) {
        this.addCheck(
          'Background Message Listener',
          'pass',
          'Message listener implemented',
          {}
        );
      } else {
        this.addCheck(
          'Background Message Listener',
          'fail',
          'No message listener found',
          {}
        );
      }

      // Check for workspace organization handlers
      if (content.includes('handleWorkspaceOrganization')) {
        this.addCheck(
          'Background Workspace Handler',
          'pass',
          'Workspace organization handler present',
          {}
        );
      } else {
        this.addCheck(
          'Background Workspace Handler',
          'fail',
          'Workspace handler missing',
          {}
        );
      }

      // Check for dual approach (Extensions API + Bridge fallback)
      const hasExtensionsAPI = content.includes('organizeViaExtensionsAPI');
      const hasBridgeFallback = content.includes('organizeViaBridge');

      if (hasExtensionsAPI && hasBridgeFallback) {
        this.addCheck(
          'Background Dual Approach',
          'pass',
          'Supports both Extensions API and Bridge fallback',
          { extensionsAPI: true, bridge: true }
        );
      } else if (hasExtensionsAPI) {
        this.addCheck(
          'Background Dual Approach',
          'warn',
          'Only Extensions API supported (no bridge fallback)',
          { extensionsAPI: true, bridge: false }
        );
      } else {
        this.addCheck(
          'Background Dual Approach',
          'fail',
          'Missing workspace organization methods',
          { extensionsAPI: false, bridge: false }
        );
      }

    } catch (error) {
      this.addCheck(
        'Background Worker Check',
        'fail',
        `Error reading background.js: ${error.message}`,
        { error: error.message }
      );
    }
  }

  // Check HTML files
  checkHTMLFiles() {
    const htmlFiles = ['popup.html', 'test-tabs.html'];
    
    for (const file of htmlFiles) {
      const filePath = path.join(this.extensionDir, file);
      
      if (!fs.existsSync(filePath)) {
        continue;
      }

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Basic HTML validation
        const hasDoctype = content.includes('<!DOCTYPE') || content.includes('<!doctype');
        const hasHtmlTag = content.includes('<html');
        const hasHeadTag = content.includes('<head');
        const hasBodyTag = content.includes('<body');
        
        if (hasDoctype && hasHtmlTag && hasHeadTag && hasBodyTag) {
          this.addCheck(
            `HTML Structure: ${file}`,
            'pass',
            'Valid HTML5 structure',
            { size: (content.length / 1024).toFixed(2) + 'KB' }
          );
        } else {
          const missing = [];
          if (!hasDoctype) missing.push('DOCTYPE');
          if (!hasHtmlTag) missing.push('html tag');
          if (!hasHeadTag) missing.push('head tag');
          if (!hasBodyTag) missing.push('body tag');
          
          this.addCheck(
            `HTML Structure: ${file}`,
            'warn',
            `Missing: ${missing.join(', ')}`,
            { missing }
          );
        }

      } catch (error) {
        this.addCheck(
          `HTML: ${file}`,
          'fail',
          `Error reading file: ${error.message}`,
          { error: error.message }
        );
      }
    }
  }

  // Generate recommendations
  generateRecommendations() {
    const recommendations = [];

    // Check for high severity issues
    const criticalIssues = this.results.checks.filter(c => c.status === 'fail');
    if (criticalIssues.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Critical Issues',
        message: `Fix ${criticalIssues.length} critical issue(s) before using the extension`,
        issues: criticalIssues.map(i => i.name)
      });
    }

    // Check for warnings
    const warnings = this.results.checks.filter(c => c.status === 'warn');
    if (warnings.length > 3) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Warnings',
        message: `Address ${warnings.length} warning(s) to improve extension reliability`,
        issues: warnings.map(i => i.name)
      });
    }

    // Check if API test passed
    const apiTest = this.results.checks.find(c => c.name === 'Gemini API Connectivity');
    if (!apiTest || apiTest.status !== 'pass') {
      recommendations.push({
        priority: 'HIGH',
        category: 'API Connectivity',
        message: 'Cannot reach Gemini API - check internet connection and firewall',
        action: 'Verify network connectivity and try accessing https://generativelanguage.googleapis.com'
      });
    }

    // Check bridge script
    const bridgeCheck = this.results.checks.find(c => c.name.includes('Bridge Script'));
    if (bridgeCheck && bridgeCheck.status !== 'pass') {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Workspace Mode',
        message: 'Bridge script has issues - Workspace mode may not work',
        action: 'Review bridge script installation instructions in DOCUMENTATION.md'
      });
    }

    this.results.recommendations = recommendations;
  }

  // Run all diagnostics
  async run() {
    console.log('🔍 Starting Comprehensive Diagnostic...\n');

    // Phase 1: Environment
    console.log('Phase 1: Environment Checks');
    this.checkEnvironment();

    // Phase 2: File Integrity
    console.log('Phase 2: File Integrity Checks');
    this.checkRequiredFiles();

    // Phase 3: Validation
    console.log('Phase 3: Validation Checks');
    this.validateManifest();
    this.validateJavaScript();
    this.checkHTMLFiles();
    this.checkBridgeScript();
    this.checkBackgroundWorker();

    // Phase 4: Feature Testing
    console.log('Phase 4: Feature Implementation Checks');
    this.checkFeatureImplementations();

    // Phase 5: Connectivity (if not quick mode)
    if (!this.quick) {
      console.log('Phase 5: Network Connectivity');
      await this.testAPIConnectivity();
    }

    // Generate recommendations
    this.generateRecommendations();

    // Output results
    this.outputResults();
  }

  // Output results based on format
  outputResults() {
    if (this.outputFormat === 'json') {
      console.log(JSON.stringify(this.results, null, 2));
      return;
    }

    // Text format output
    console.log('\n' + '='.repeat(70));
    console.log('DIAGNOSTIC REPORT');
    console.log('='.repeat(70));
    console.log(`Generated: ${this.results.timestamp}`);
    console.log(`Directory: ${this.extensionDir}`);
    console.log('='.repeat(70));
    
    console.log('\n📊 SUMMARY');
    console.log(`  ✅ Passed:   ${this.results.summary.passed}`);
    console.log(`  ⚠️  Warnings: ${this.results.summary.warnings}`);
    console.log(`  ❌ Failed:   ${this.results.summary.failed}`);

    // Group checks by status
    const failed = this.results.checks.filter(c => c.status === 'fail');
    const warnings = this.results.checks.filter(c => c.status === 'warn');
    const passed = this.results.checks.filter(c => c.status === 'pass');

    if (failed.length > 0) {
      console.log('\n❌ FAILED CHECKS:');
      failed.forEach(check => {
        console.log(`  ❌ ${check.name}`);
        console.log(`     ${check.message}`);
      });
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      warnings.forEach(check => {
        console.log(`  ⚠️  ${check.name}`);
        console.log(`     ${check.message}`);
      });
    }

    console.log('\n✅ PASSED CHECKS:');
    passed.forEach(check => {
      console.log(`  ✅ ${check.name}: ${check.message}`);
    });

    // Recommendations
    if (this.results.recommendations && this.results.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      this.results.recommendations.forEach((rec, idx) => {
        const icon = rec.priority === 'HIGH' ? '🔴' : rec.priority === 'MEDIUM' ? '🟡' : '🟢';
        console.log(`\n  ${icon} [${rec.priority}] ${rec.category}`);
        console.log(`     ${rec.message}`);
        if (rec.action) {
          console.log(`     Action: ${rec.action}`);
        }
      });
    }

    // Overall status
    console.log('\n' + '='.repeat(70));
    if (failed.length === 0 && warnings.length === 0) {
      console.log('✅ ALL CHECKS PASSED - Extension appears healthy');
    } else if (failed.length === 0) {
      console.log('⚠️  EXTENSION IS FUNCTIONAL BUT HAS WARNINGS');
    } else {
      console.log('❌ CRITICAL ISSUES DETECTED - Extension may not work properly');
    }
    console.log('='.repeat(70));

    console.log('\n📖 For more help, see:');
    console.log('   - TROUBLESHOOTING.md for common issues');
    console.log('   - DOCUMENTATION.md for installation guide');
    console.log('   - INSTALL.md for step-by-step instructions');
    console.log('\n');
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    quick: false,
    outputFormat: 'text'
  };

  for (const arg of args) {
    if (arg === '--quick' || arg === '-q') {
      options.quick = true;
    } else if (arg === '--json' || arg === '-j') {
      options.outputFormat = 'json';
    } else if (arg === '--output' || arg === '-o') {
      const nextArg = args[args.indexOf(arg) + 1];
      if (nextArg === 'json') {
        options.outputFormat = 'json';
      }
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Vivaldi AI Tab Sorter - Diagnostic Tool

Usage:
  node diagnostic.js [options]

Options:
  --quick, -q        Run quick checks only (skip network tests)
  --json, -j         Output results in JSON format
  --output json      Output results in JSON format
  --help, -h         Show this help message

Examples:
  node diagnostic.js              # Run full diagnostics
  node diagnostic.js --quick      # Quick checks only
  node diagnostic.js --json       # Output as JSON
      `);
      process.exit(0);
    }
  }

  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const diagnostic = new DiagnosticTool(options);
  
  diagnostic.run().then(() => {
    const exitCode = diagnostic.results.summary.failed > 0 ? 1 : 0;
    process.exit(exitCode);
  }).catch(error => {
    console.error('Fatal error running diagnostics:', error);
    process.exit(2);
  });
}

module.exports = DiagnosticTool;
