# Open Questions – Vivaldi AI Tab Sorter

> **✅ RESOLVED** – All 20 questions have been answered and implemented in v3.0.0. This file is kept for reference.

---

## 1 · Vivaldi API availability

The extension tries `vivaldi.workspaces` directly in the service worker before falling back to the bridge. Nobody has confirmed whether Vivaldi actually exposes that API to extensions.

- [x] **c)** I haven't tested yet — keep both paths for now

> **Implemented**: Both direct API and bridge fallback paths are maintained.

---

## 2 · Default mode

The popup defaults to **Workspaces** on first install. Should it?

- [x] **b)** Default to Tab Stacks instead (works out of the box, no setup friction)

> **Implemented**: Default mode is now `stacks` (Tab Stacks).

---

## 3 · What happens to "Uncategorized" tabs?

Currently the AI puts tabs it can't match into an `Uncategorized` bucket. That bucket is silently skipped in Workspace and Tab Stack modes (no group/workspace is created for it).

- [x] **c)** Let the user choose (add a toggle)

> **Implemented**: `includeUncategorized` toggle in settings.

---

## 4 · Workspace name collisions

If a workspace called "Work" already exists, the extension reuses it and moves tabs into it. Should it?

- [x] **a)** Yes, reuse existing workspaces by name (current behavior)

> **Implemented**: Existing workspaces are reused by name.

---

## 5 · Tabs already in workspaces

If a tab is already assigned to a Vivaldi workspace, what should happen when the extension moves it?

- [x] **c)** Let the user choose (add a toggle)

> **Implemented**: `reassignExisting` toggle in settings.

---

## 6 · Bridge install script — security concern

The "Download Install Script" button generates a PowerShell / bash script that writes files into Vivaldi's internal resource directory. Some users may not trust running a downloaded script with elevated privileges.

- [x] **a)** Keep as-is — the script is readable and users can inspect it

> **Implemented**: Script download kept; manual instructions available in docs.

---

## 7 · Bridge persistence across Vivaldi updates

After Vivaldi auto-updates, the bridge gets wiped because the version folder changes. The current answer is "re-run the install script."

- [x] **a)** That's fine — just document it

> **Implemented**: Documented in INSTALL.md, DOCUMENTATION.md, and TROUBLESHOOTING.md.

---

## 8 · Tab Stacks vs. Vivaldi native stacking

The "Tab Stacks" mode uses `chrome.tabGroups` (Chromium tab groups). Vivaldi has its own stacking with compact/two-level/accordion views. The current docs explain the difference, but:

- [x] **a)** That's clear enough — keep it as-is

> **Implemented**: Documentation explains the difference between Tab Stacks (chrome.tabGroups) and Vivaldi's native stacking.

---

## 9 · Scope for Workspace mode

Tab Stacks mode has a "Current Window / All Windows" scope toggle. Workspace mode does not — it always processes all tabs from all windows.

- [x] **b)** Add a similar scope toggle for Workspace mode too

> **Implemented**: `workspaceScope` setting with "all windows" / "current window" options.

---

## 10 · Duplicate removal behavior

Duplicate detection matches exact URLs only. Tab titles are ignored. Pinned tabs are also closed if duplicated.

- [x] **a)** That's fine

> **Implemented**: Exact URL matching for duplicate removal.

---

## 11 · Gemini model default

Currently defaults to `gemini-2.0-flash`. Google may deprecate or rename models over time.

- [x] **a)** Keep the hardcoded default — user can change it

> **Implemented**: Default is `gemini-2.0-flash`; user can select from dynamically fetched model list.

---

## 12 · API key validation

The key is validated by format only (`starts with "AI", ≥35 chars`). No actual test request is made.

- [x] **a)** That's fine — the first Analyze call will catch bad keys

> **Implemented**: Format-only validation; actual validation happens on first API call.

---

## 13 · Icons

The manifest references `icons/icon16.png`, `icon48.png`, and `icon128.png`. Are these real icons or placeholders?

- [x] **b)** They're placeholders — I'll provide proper icons

> **Status**: Placeholder icons; to be replaced with proper icons.

---

## 14 · Chrome Web Store / Vivaldi community

Is this extension going to be published somewhere, or is it local-only?

- [x] **a)** Local / side-loaded only — no store listing needed

> **Implemented**: Extension designed for local/side-loaded use.

---

## 15 · Tests

There is no test framework. `validate.sh` only checks file existence and JS syntax.

- [x] **b)** Add unit tests for the JSON parsing / prompt building logic (e.g. with Vitest or plain Node)

> **Implemented**: 38 unit tests in `test/parser.test.js` using plain Node.js assertions.

---

## 16 · Popup auto-close

After applying, the popup waits 2 seconds then calls `window.close()`. Some users may want to see the result.

- [x] **c)** Make it a toggle in settings

> **Implemented**: `autoClose` toggle in settings (default: on).

---

## 17 · Large tab counts

For 200+ tabs, the entire tab list is sent to Gemini in a single request. This may hit token limits.

- [x] **b)** Add chunking: split into batches of N tabs and merge results

> **Implemented**: Tabs are chunked at 100+ (CHUNK_THRESHOLD), split into batches of 80 (CHUNK_SIZE), and results merged.

---

## 18 · Other AI providers

The extension is hard-wired to Google Gemini.

- [x] **b)** I'd like to add OpenAI / Claude support too

> **Implemented**: Multi-provider support with Gemini, OpenAI, and Claude. Provider dropdown in settings.

---

## 19 · Localization / i18n

Everything is in English.

- [x] **a)** English only is fine

> **Implemented**: English only.

---

## 20 · License scope

The repo has an MIT license. The install script writes files into Vivaldi's internal directory.

- [x] **c)** Both — MIT license + explicit disclaimer

> **Implemented**: MIT license retained. Disclaimer comment added to top of `ai_bridge.js`.

---

*All questions resolved and implemented in v3.0.0.*
