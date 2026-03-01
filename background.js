'use strict';

// ── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  if (req.action === 'organizeToWorkspaces') {
    organizeWorkspaces(req.categorizedTabs, req.scope, req.includeUncategorized, req.reassignExisting)
      .then(r => sendResponse(r))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (req.action === 'checkWorkspaceSupport') {
    checkWorkspaceSupport()
      .then(r => sendResponse(r))
      .catch(() => sendResponse({ available: false, method: 'none' }));
    return true;
  }

  if (req.action === 'getBridgeScript') {
    sendResponse({ script: BRIDGE_SCRIPT_CONTENT });
    return false;
  }
});

// ── Workspace Support Detection ──────────────────────────────────────────────

async function checkWorkspaceSupport() {
  // Check 1: Direct Vivaldi API — vivaldi.workspaces
  if (typeof vivaldi !== 'undefined' && vivaldi.workspaces) {
    try {
      await new Promise((resolve, reject) => {
        vivaldi.workspaces.getAll(ws => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(ws);
        });
      });
      return { available: true, method: 'direct' };
    } catch { /* fall through */ }
  }

  // Check 2: Alternative Vivaldi API — vivaldi.workspacesPrivate
  if (typeof vivaldi !== 'undefined' && vivaldi.workspacesPrivate) {
    try {
      await new Promise((resolve, reject) => {
        vivaldi.workspacesPrivate.getAll(ws => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(ws);
        });
      });
      return { available: true, method: 'direct-private' };
    } catch { /* fall through */ }
  }

  // Check 3: Bridge via storage ping
  try {
    await chrome.storage.local.set({
      workspaceCommand: { action: 'test', timestamp: Date.now() },
    });
    await new Promise(r => setTimeout(r, 1500));
    const { workspaceCommandResult: res } = await chrome.storage.local.get('workspaceCommandResult');
    await chrome.storage.local.remove(['workspaceCommand', 'workspaceCommandResult']);
    if (res?.success && res.timestamp > Date.now() - 5000) {
      return { available: true, method: 'bridge' };
    }
  } catch { /* fall through */ }

  return { available: false, method: 'none' };
}

// ── Workspace Organisation ───────────────────────────────────────────────────

async function organizeWorkspaces(categorized, scope = 'all', includeUncategorized = false, reassignExisting = true) {
  // Approach 1: Direct Vivaldi API — vivaldi.workspaces
  if (typeof vivaldi !== 'undefined' && vivaldi.workspaces) {
    try {
      return await organizeViaDirect(categorized, scope, includeUncategorized, reassignExisting);
    } catch (e) {
      console.log('Direct Vivaldi API failed:', e.message);
    }
  }

  // Approach 2: Alternative Vivaldi API — vivaldi.workspacesPrivate
  if (typeof vivaldi !== 'undefined' && vivaldi.workspacesPrivate) {
    try {
      return await organizeViaDirect(categorized, scope, includeUncategorized, reassignExisting, vivaldi.workspacesPrivate);
    } catch (e) {
      console.log('Private Vivaldi API failed:', e.message);
    }
  }

  // Approach 3: Bridge communication
  try {
    return await organizeViaBridge(categorized, scope, includeUncategorized, reassignExisting);
  } catch (e) {
    console.log('Bridge failed:', e.message);
  }

  throw new Error(
    'Workspace API not available. Install the bridge or use Tab Stacks mode (works without a bridge).',
  );
}

// Direct Vivaldi API (works if vivaldi.workspaces or vivaldi.workspacesPrivate is exposed)
async function organizeViaDirect(categorized, scope = 'all', includeUncategorized = false, reassignExisting = true, wsApi = null) {
  const api = wsApi || (typeof vivaldi !== 'undefined' && vivaldi.workspaces);
  if (!api) throw new Error('No workspace API available');
  const getAll = () => new Promise((resolve, reject) => {
    api.getAll(ws => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(ws || []);
    });
  });
  const create = title => new Promise((resolve, reject) => {
    api.create({ title }, ws => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else if (ws?.id) resolve(ws.id);
      else reject(new Error('Failed to create workspace'));
    });
  });
  const moveTab = (tabId, wsId) => new Promise(resolve => {
    if (api.addTab) {
      api.addTab(wsId, tabId, () => resolve());
    } else if (typeof vivaldi !== 'undefined' && vivaldi.tabsPrivate?.setWorkspace) {
      vivaldi.tabsPrivate.setWorkspace(tabId, wsId, () => resolve());
    } else {
      resolve();
    }
  });

  const existing = await getAll();
  const nameToId = new Map(existing.map(w => [w.title, w.id]));

  let targetWindowId = null;
  if (scope === 'current') {
    const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
    targetWindowId = win.id;
  }

  for (const [category, tabs] of Object.entries(categorized)) {
    if (!tabs.length) continue;
    if (!includeUncategorized && category === 'Uncategorized') continue;
    let wsId = nameToId.get(category);
    if (!wsId) {
      wsId = await create(category);
      nameToId.set(category, wsId);
    }
    for (const t of tabs) {
      if (scope === 'current' && targetWindowId !== null && t.windowId !== targetWindowId) continue;
      if (!reassignExisting) {
        const tab = await chrome.tabs.get(t.id);
        if (tab.vivExtData) {
          try {
            const ext = JSON.parse(tab.vivExtData);
            // Vivaldi stores the workspace id in ext.group
            if (ext.group !== undefined && ext.group !== null) continue;
          } catch { /* not assigned */ }
        }
      }
      await moveTab(t.id, wsId);
    }
  }
  return { success: true, method: 'direct' };
}

// Bridge communication via storage
async function organizeViaBridge(categorized, scope = 'all', includeUncategorized = false, reassignExisting = true) {
  await chrome.storage.local.set({
    workspaceCommand: {
      action: 'organize',
      categorizedTabs: categorized,
      includeUncategorized,
      reassignExisting,
      scope,
      timestamp: Date.now(),
    },
  });

  await new Promise(r => setTimeout(r, 2000));

  const { workspaceCommandResult: res } = await chrome.storage.local.get('workspaceCommandResult');

  if (res && res.timestamp > Date.now() - 5000) {
    await chrome.storage.local.remove(['workspaceCommand', 'workspaceCommandResult']);
    if (res.success) return { success: true, method: 'bridge' };
    throw new Error(res.error || 'Bridge operation failed.');
  }

  throw new Error('Bridge not responding.');
}

// ── Bridge Script Content (embedded for setup helper) ────────────────────────

const BRIDGE_SCRIPT_CONTENT = `// ai_bridge.js – Vivaldi Workspace Bridge (embedded)
// DISCLAIMER: This script modifies Vivaldi's internal window.html.
// It is provided under the MIT license. Use at your own risk.
// The authors are not responsible for any issues caused by
// modifying browser internal files. Always back up window.html first.
// See the LICENSE file for full license terms.
(function () {
  'use strict';
  if (typeof vivaldi === 'undefined' || !vivaldi.workspaces) {
    console.warn('[AI Tab Sorter] vivaldi.workspaces not available – bridge inactive.');
    return;
  }
  console.log('[AI Tab Sorter] Bridge loaded.');

  chrome.storage.onChanged.addListener(async (changes, ns) => {
    if (ns !== 'local' || !changes.workspaceCommand?.newValue) return;
    const cmd = changes.workspaceCommand.newValue;
    try {
      if (cmd.action === 'test') {
        await respond({ success: true, message: 'Bridge OK' });
      } else if (cmd.action === 'organize') {
        await organise(cmd.categorizedTabs, cmd.includeUncategorized, cmd.reassignExisting);
        await respond({ success: true });
      }
    } catch (err) {
      console.error('[AI Tab Sorter] Bridge error:', err);
      await respond({ success: false, error: err.message });
    }
  });

  async function respond(payload) {
    await chrome.storage.local.set({
      workspaceCommandResult: { ...payload, timestamp: Date.now() },
    });
  }

  function getWorkspaces() {
    return new Promise(resolve => {
      vivaldi.workspaces.getAll(ws => resolve(ws || []));
    });
  }
  function createWorkspace(title) {
    return new Promise((resolve, reject) => {
      vivaldi.workspaces.create({ title }, ws => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else if (ws?.id) resolve(ws.id);
        else reject(new Error('Failed to create workspace'));
      });
    });
  }
  function moveTab(tabId, workspaceId) {
    return new Promise(resolve => {
      if (vivaldi.workspaces.addTab) {
        vivaldi.workspaces.addTab(workspaceId, tabId, () => resolve());
      } else if (vivaldi.tabsPrivate?.setWorkspace) {
        vivaldi.tabsPrivate.setWorkspace(tabId, workspaceId, () => resolve());
      } else {
        resolve();
      }
    });
  }

  async function organise(categorized, includeUncategorized = false, reassignExisting = true) {
    const existing = await getWorkspaces();
    const nameToId = new Map(existing.map(w => [w.title, w.id]));
    for (const [category, tabs] of Object.entries(categorized)) {
      if (!tabs.length) continue;
      if (!includeUncategorized && category === 'Uncategorized') continue;
      let wsId = nameToId.get(category);
      if (!wsId) {
        wsId = await createWorkspace(category);
        nameToId.set(category, wsId);
      }
      for (const t of tabs) { await moveTab(t.id, wsId); }
    }
  }
})();
`;

// ── Lifecycle ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    console.log('Vivaldi AI Tab Sorter installed.');
  }
});
