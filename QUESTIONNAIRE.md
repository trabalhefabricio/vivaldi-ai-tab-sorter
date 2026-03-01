# Open Questions – Vivaldi AI Tab Sorter

Everything below is an unresolved decision, unknown, or assumption the code currently makes.
Pick the answers that match what you actually want and I'll implement them.

---

## 1 · Vivaldi API availability

The extension tries `vivaldi.workspaces` directly in the service worker before falling back to the bridge. Nobody has confirmed whether Vivaldi actually exposes that API to extensions.

- [ ] **a)** I've tested it — the direct API **does** work in the service worker (bridge is unnecessary)
- [ ] **b)** I've tested it — the direct API **does not** work (bridge is still required)
- [ ] **c)** I haven't tested yet — keep both paths for now

---

## 2 · Default mode

The popup defaults to **Workspaces** on first install. Should it?

- [ ] **a)** Yes, default to Workspaces (power users will install the bridge)
- [ ] **b)** Default to Tab Stacks instead (works out of the box, no setup friction)
- [ ] **c)** Default to Windows (simplest, always works)

---

## 3 · What happens to "Uncategorized" tabs?

Currently the AI puts tabs it can't match into an `Uncategorized` bucket. That bucket is silently skipped in Workspace and Tab Stack modes (no group/workspace is created for it).

- [ ] **a)** Keep skipping — uncategorized tabs stay where they are
- [ ] **b)** Create an "Uncategorized" workspace/group too
- [ ] **c)** Let the user choose (add a toggle)

---

## 4 · Workspace name collisions

If a workspace called "Work" already exists, the extension reuses it and moves tabs into it. Should it?

- [ ] **a)** Yes, reuse existing workspaces by name (current behavior)
- [ ] **b)** Always create fresh workspaces (append a number if needed)
- [ ] **c)** Ask the user each time

---

## 5 · Tabs already in workspaces

If a tab is already assigned to a Vivaldi workspace, what should happen when the extension moves it?

- [ ] **a)** Just move it — the new category wins
- [ ] **b)** Skip tabs that are already in a workspace
- [ ] **c)** Let the user choose (add a toggle)

---

## 6 · Bridge install script — security concern

The "Download Install Script" button generates a PowerShell / bash script that writes files into Vivaldi's internal resource directory. Some users may not trust running a downloaded script with elevated privileges.

- [ ] **a)** Keep as-is — the script is readable and users can inspect it
- [ ] **b)** Also show the raw commands in the popup so users can copy/paste manually
- [ ] **c)** Remove the script download; just show step-by-step instructions in the popup
- [ ] **d)** All of the above — offer script download **and** copy-pasteable commands **and** a link to manual instructions

---

## 7 · Bridge persistence across Vivaldi updates

After Vivaldi auto-updates, the bridge gets wiped because the version folder changes. The current answer is "re-run the install script."

- [ ] **a)** That's fine — just document it
- [ ] **b)** Add a reminder: detect the Vivaldi version on popup open, compare to last known version, and warn the user
- [ ] **c)** Investigate a Vivaldi mod-style hook (e.g. custom.js) that doesn't get wiped on update

---

## 8 · Tab Stacks vs. Vivaldi native stacking

The "Tab Stacks" mode uses `chrome.tabGroups` (Chromium tab groups). Vivaldi has its own stacking with compact/two-level/accordion views. The current docs explain the difference, but:

- [ ] **a)** That's clear enough — keep it as-is
- [ ] **b)** Rename "Tab Stacks" to something else (e.g. "Tab Groups") to avoid confusion with Vivaldi's native feature
- [ ] **c)** Try to use Vivaldi's native stacking API (`vivaldi.tabsPrivate`) instead of `chrome.tabGroups`

---

## 9 · Scope for Workspace mode

Tab Stacks mode has a "Current Window / All Windows" scope toggle. Workspace mode does not — it always processes all tabs from all windows.

- [ ] **a)** That's fine — workspaces are window-independent
- [ ] **b)** Add a similar scope toggle for Workspace mode too

---

## 10 · Duplicate removal behavior

Duplicate detection matches exact URLs only. Tab titles are ignored. Pinned tabs are also closed if duplicated.

- [ ] **a)** That's fine
- [ ] **b)** Never close pinned tabs
- [ ] **c)** Match by domain instead of exact URL (looser dedup)
- [ ] **d)** Let the user pick between exact URL and domain matching

---

## 11 · Gemini model default

Currently defaults to `gemini-2.0-flash`. Google may deprecate or rename models over time.

- [ ] **a)** Keep the hardcoded default — user can change it
- [ ] **b)** Auto-fetch the model list on first install and pick the best available
- [ ] **c)** Let me specify which model to default to: `_______________`

---

## 12 · API key validation

The key is validated by format only (`starts with "AI", ≥35 chars`). No actual test request is made.

- [ ] **a)** That's fine — the first Analyze call will catch bad keys
- [ ] **b)** Add a "Test Key" button that makes a lightweight API call
- [ ] **c)** Auto-test the key when it's entered

---

## 13 · Icons

The manifest references `icons/icon16.png`, `icon48.png`, and `icon128.png`. Are these real icons or placeholders?

- [ ] **a)** They're real — leave them
- [ ] **b)** They're placeholders — I'll provide proper icons
- [ ] **c)** Generate simple icons for me

---

## 14 · Chrome Web Store / Vivaldi community

Is this extension going to be published somewhere, or is it local-only?

- [ ] **a)** Local / side-loaded only — no store listing needed
- [ ] **b)** I want to publish on the Chrome Web Store (needs stricter permissions review)
- [ ] **c)** I want to share it on the Vivaldi community forums / modding hub

---

## 15 · Tests

There is no test framework. `validate.sh` only checks file existence and JS syntax.

- [ ] **a)** That's enough for now
- [ ] **b)** Add unit tests for the JSON parsing / prompt building logic (e.g. with Vitest or plain Node)
- [ ] **c)** Add integration tests that mock the Chrome APIs

---

## 16 · Popup auto-close

After applying, the popup waits 2 seconds then calls `window.close()`. Some users may want to see the result.

- [ ] **a)** Keep the auto-close
- [ ] **b)** Don't auto-close — let the user close it
- [ ] **c)** Make it a toggle in settings

---

## 17 · Large tab counts

For 200+ tabs, the entire tab list is sent to Gemini in a single request. This may hit token limits.

- [ ] **a)** That's fine — Gemini handles it
- [ ] **b)** Add chunking: split into batches of N tabs and merge results
- [ ] **c)** Just warn the user if tab count is very high

---

## 18 · Other AI providers

The extension is hard-wired to Google Gemini.

- [ ] **a)** Gemini only — keep it simple
- [ ] **b)** I'd like to add OpenAI / Claude support too
- [ ] **c)** Make it provider-agnostic with a pluggable backend

---

## 19 · Localization / i18n

Everything is in English.

- [ ] **a)** English only is fine
- [ ] **b)** I want to support other languages via Chrome's `_locales` system
- [ ] **c)** Not now, but structure the code so it's easy to add later

---

## 20 · License scope

The repo has an MIT license. The install script writes files into Vivaldi's internal directory.

- [ ] **a)** MIT is fine — the user runs it at their own risk
- [ ] **b)** Add a disclaimer to the install script about modifying browser files
- [ ] **c)** Both — MIT license + explicit disclaimer

---

*Pick your answers (letter per question) and I'll implement the changes.*
