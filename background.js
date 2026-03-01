'use strict';

// ── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  if (req.action === 'organizeToWorkspaces') {
    organizeWorkspaces(req.categorizedTabs)
      .then(r => sendResponse(r))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true; // async response
  }
});

// ── Workspace Organisation ───────────────────────────────────────────────────

async function organizeWorkspaces(categorized) {
  // Try the Chrome Extensions API first (works without bridge)
  try {
    return await organizeViaAPI(categorized);
  } catch (apiErr) {
    console.log('Extensions API failed, trying bridge:', apiErr.message);
    return await organizeViaBridge(categorized);
  }
}

// Approach 1 – create separate windows per category (no bridge needed)
async function organizeViaAPI(categorized) {
  const currentWindow = await chrome.windows.getCurrent();
  let count = 0;

  for (const [category, tabs] of Object.entries(categorized)) {
    if (!tabs.length) continue;

    const first = tabs[0];
    const win = await chrome.windows.create({
      url: first.url,
      focused: false,
      type: 'normal',
    });
    count++;

    if (tabs.length > 1) {
      try {
        await chrome.tabs.move(
          tabs.slice(1).map(t => t.id),
          { windowId: win.id, index: -1 },
        );
      } catch (e) {
        console.error(`Error moving tabs for "${category}":`, e);
      }
    }

    // Remove the auto-created blank tab if we opened a URL
    if (win.tabs?.length && first.id !== win.tabs[0].id) {
      try { await chrome.tabs.remove(win.tabs[0].id); } catch {}
    }
  }

  // Return focus to original window
  try { await chrome.windows.update(currentWindow.id, { focused: true }); } catch {}

  return {
    success: true,
    method: 'extensionsAPI',
    windowsCreated: count,
    message: `Created ${count} workspace windows.`,
  };
}

// Approach 2 – bridge communication via storage
async function organizeViaBridge(categorized) {
  await chrome.storage.local.set({
    workspaceCommand: { action: 'organize', categorizedTabs: categorized, timestamp: Date.now() },
  });

  await new Promise(r => setTimeout(r, 2000));

  const { workspaceCommandResult: res } = await chrome.storage.local.get('workspaceCommandResult');

  if (res && res.timestamp > Date.now() - 5000) {
    await chrome.storage.local.remove(['workspaceCommand', 'workspaceCommandResult']);
    if (res.success) return { success: true, method: 'bridge' };
    throw new Error(res.error || 'Bridge operation failed.');
  }

  throw new Error('Vivaldi bridge not responding. Install the bridge script or use another mode.');
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    console.log('Vivaldi AI Tab Sorter installed.');
  }
});
