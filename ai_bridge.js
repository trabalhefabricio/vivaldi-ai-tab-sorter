// DISCLAIMER: This script modifies Vivaldi's internal window.html.
// Use at your own risk under the MIT license. Always back up first.

// ai_bridge.js – Vivaldi Workspace Bridge
//
// Inject into Vivaldi's window.html to give the extension access to
// vivaldi.workspaces.  Installation steps:
//
//   1. Close Vivaldi completely.
//   2. Go to the Vivaldi resources directory:
//        Win  – %LOCALAPPDATA%\Vivaldi\Application\<ver>\resources\vivaldi
//        Mac  – /Applications/Vivaldi.app/Contents/Versions/<ver>/
//               Vivaldi Framework.framework/Resources/vivaldi
//        Linux – /opt/vivaldi/resources/vivaldi
//   3. Back up window.html.
//   4. Add  <script src="ai_bridge.js"></script>  before </body>.
//   5. Copy this file into the same directory.
//   6. Restart Vivaldi.

(function () {
  'use strict';

  if (typeof vivaldi === 'undefined' || !vivaldi.workspaces) {
    console.warn('[AI Tab Sorter] vivaldi.workspaces not available – bridge inactive.');
    return;
  }
  console.log('[AI Tab Sorter] Bridge loaded.');

  // ── Listen for commands via chrome.storage ───────────────────────────────

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

  // ── Workspace helpers ────────────────────────────────────────────────────

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
      // Try the primary API first, fall back to tabsPrivate
      if (vivaldi.workspaces.addTab) {
        vivaldi.workspaces.addTab(workspaceId, tabId, () => resolve());
      } else if (vivaldi.tabsPrivate?.setWorkspace) {
        vivaldi.tabsPrivate.setWorkspace(tabId, workspaceId, () => resolve());
      } else {
        resolve(); // silently skip
      }
    });
  }

  // ── Main organise routine ────────────────────────────────────────────────

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

      for (const t of tabs) {
        await moveTab(t.id, wsId);
      }
    }
  }
})();
