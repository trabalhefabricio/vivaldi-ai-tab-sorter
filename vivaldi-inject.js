// vivaldi-inject.js
// Content script that injects vivaldi-core.js into the page context
// This allows access to vivaldi.* APIs which are not available in content script context

(function() {
  'use strict';
  
  // Only run in Vivaldi browser
  const isVivaldi = navigator.userAgent.includes('Vivaldi') || typeof window.vivaldi !== 'undefined';
  
  if (!isVivaldi) {
    console.log('[Vivaldi Inject] Not running in Vivaldi browser');
    return;
  }
  
  console.log('[Vivaldi Inject] Vivaldi detected, injecting core script...');
  
  // Inject vivaldi-core.js into the page context
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('vivaldi-core.js');
  script.onload = function() {
    console.log('[Vivaldi Inject] Core script injected successfully');
    this.remove();
  };
  script.onerror = function() {
    console.error('[Vivaldi Inject] Failed to inject core script');
    this.remove();
  };
  
  // Inject as soon as possible
  (document.head || document.documentElement).appendChild(script);
  
  // Set up message relay between page context and extension
  window.addEventListener('message', function(event) {
    // Only accept messages from same window
    if (event.source !== window) return;
    
    // Messages from vivaldi-core.js to extension
    if (event.data.type === 'VIVALDI_TO_EXTENSION') {
      chrome.runtime.sendMessage(event.data.payload).catch(err => {
        console.error('[Vivaldi Inject] Error sending to extension:', err);
      });
    }
  });
  
  // Messages from extension to vivaldi-core.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXTENSION_TO_VIVALDI') {
      window.postMessage({
        type: 'EXTENSION_TO_VIVALDI',
        payload: message.payload
      }, '*');
      sendResponse({ received: true });
    }
    return true; // Keep channel open for async response
  });
  
  console.log('[Vivaldi Inject] Message relay established');
  
})();
