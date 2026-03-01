'use strict';

// ── Lifecycle ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    console.log('Vivaldi AI Tab Sorter installed.');
  }
});
