# Vivaldi AI Tab Sorter — Complete Specification

> **Version described:** 3.0.0  
> **Purpose of this document:** Describe every behavior, feature, data flow, UI element, API interaction, and edge case of the Vivaldi AI Tab Sorter extension in extreme detail, sufficient to rebuild the project from scratch.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & File Structure](#2-architecture--file-structure)
3. [Manifest & Permissions](#3-manifest--permissions)
4. [Popup UI (popup.html + popup.js)](#4-popup-ui-popuphtml--popupjs)
   - 4.1 [Visual Design](#41-visual-design)
   - 4.2 [UI Elements — Full Inventory](#42-ui-elements--full-inventory)
   - 4.3 [Settings Persistence](#43-settings-persistence)
   - 4.4 [Provider Switching](#44-provider-switching)
   - 4.5 [Browser Detection](#45-browser-detection)
5. [AI Integration](#5-ai-integration)
   - 5.1 [Prompt Construction](#51-prompt-construction)
   - 5.2 [Google Gemini Provider](#52-google-gemini-provider)
   - 5.3 [OpenAI Provider](#53-openai-provider)
   - 5.4 [Anthropic Claude Provider](#54-anthropic-claude-provider)
   - 5.5 [Response Parsing](#55-response-parsing)
   - 5.6 [Chunked Analysis](#56-chunked-analysis)
   - 5.7 [Rate Limiting & Retry Logic](#57-rate-limiting--retry-logic)
6. [Tab Collection & Processing](#6-tab-collection--processing)
   - 6.1 [Tab Gathering](#61-tab-gathering)
   - 6.2 [Hibernated/Discarded Tab Handling](#62-hibernateddiscarded-tab-handling)
   - 6.3 [Duplicate Removal](#63-duplicate-removal)
7. [Organization Modes](#7-organization-modes)
   - 7.1 [Tab Stacks / Groups Mode](#71-tab-stacks--groups-mode)
   - 7.2 [Workspaces Mode](#72-workspaces-mode)
   - 7.3 [Windows Mode](#73-windows-mode)
8. [Background Service Worker (background.js)](#8-background-service-worker-backgroundjs)
   - 8.1 [Message Handling](#81-message-handling)
   - 8.2 [Workspace Support Detection](#82-workspace-support-detection)
   - 8.3 [Workspace Organization — Direct API](#83-workspace-organization--direct-api)
   - 8.4 [Workspace Organization — Bridge](#84-workspace-organization--bridge)
9. [Vivaldi Bridge (ai_bridge.js)](#9-vivaldi-bridge-ai_bridgejs)
   - 9.1 [How It Works](#91-how-it-works)
   - 9.2 [Communication Protocol](#92-communication-protocol)
   - 9.3 [Bridge Installation](#93-bridge-installation)
10. [Bridge Installer Script Generation](#10-bridge-installer-script-generation)
11. [Export / Import Settings](#11-export--import-settings)
12. [Request Tracking & Usage](#12-request-tracking--usage)
13. [Security & Content Security Policy](#13-security--content-security-policy)
14. [Animal Codenames System](#14-animal-codenames-system)
15. [Setup Scripts (install.sh / install.ps1)](#15-setup-scripts-installsh--installps1)
16. [Build & CI Pipeline](#16-build--ci-pipeline)
17. [Testing](#17-testing)
18. [Constants & Configuration Values](#18-constants--configuration-values)
19. [Complete Data Flow — End to End](#19-complete-data-flow--end-to-end)
20. [Edge Cases & Error Handling](#20-edge-cases--error-handling)

---

## 1. Project Overview

**Vivaldi AI Tab Sorter** is a Chrome Manifest V3 browser extension that uses AI (Google Gemini, OpenAI GPT, or Anthropic Claude) to categorize open browser tabs into user-defined categories. It then organizes those tabs into one of three modes: Vivaldi Workspaces, Tab Stacks/Groups, or Separate Windows.

**Core workflow:**
1. User configures an AI provider + API key, enters category names, and optionally adds custom rules.
2. User clicks **Analyze** — the extension collects all open tabs, sends their titles and URLs to the selected AI, and gets back a categorization.
3. User sees a **preview** of how tabs will be sorted (category name → tab count).
4. User clicks **Apply** — tabs are actually moved/grouped/organized into the chosen mode.

The extension works in both **Vivaldi** (with full Workspace support) and **Chrome/Chromium** (Tab Groups + Windows modes only). It auto-detects the browser at runtime and adapts the UI accordingly.

---

## 2. Architecture & File Structure

```
vivaldi-ai-tab-sorter/
├── manifest.json          # Chrome Manifest V3 — declares permissions, popup, service worker
├── popup.html             # The extension popup UI — single HTML file with all CSS inline
├── popup.js               # All popup logic — TabSorter class, AI calls, tab organization
├── background.js          # Service worker — workspace support detection, organization, bridge comms
├── ai_bridge.js           # Standalone bridge script injected into Vivaldi's window.html
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg           # Source SVG
├── install.sh             # macOS/Linux: copies extension + installs Vivaldi bridge
├── install.ps1            # Windows: copies extension + installs Vivaldi bridge
├── install.bat            # Windows: double-click wrapper that calls install.ps1
├── install.command         # macOS: double-click wrapper that calls install.sh
├── build.sh               # Packages the extension into a distributable .zip
├── validate.sh            # Validation checks (file presence, manifest, JS syntax, tests)
├── test/
│   └── parser.test.js     # Unit tests for pure functions (parseResponse, buildPrompt, etc.)
├── test-tabs.html         # Manual test harness for the popup (not part of build)
├── .github/workflows/
│   ├── build.yml          # CI: validate + test + package on every push
│   └── release.yml        # CI: create GitHub Release on v* tags
├── .gitignore
├── LICENSE                # MIT
├── README.md
├── DOCUMENTATION.md
├── INSTALL.md
├── TROUBLESHOOTING.md
├── EXAMPLES.md
├── CHANGELOG.md
├── IMPLEMENTATION_SUMMARY.md
├── QUESTIONNAIRE.md
└── TEST_RESULTS.md
```

### Dependency model
- **Zero npm dependencies.** Everything is vanilla JavaScript.
- No bundler, no transpiler, no framework.
- The test file (`test/parser.test.js`) runs directly under Node.js with zero imports — it duplicates the pure functions from `popup.js` at the top of the file.
- Build tools: `bash`, `node`, `zip` (all standard UNIX tools).

---

## 3. Manifest & Permissions

**manifest.json** — Chrome Manifest V3:

```json
{
  "manifest_version": 3,
  "name": "Vivaldi AI Tab Sorter",
  "version": "3.0.0",
  "description": "AI-powered tab organizer for Vivaldi & Chrome – sort hundreds of tabs into Workspaces, Tab Stacks, or Windows using Gemini, OpenAI, or Claude",
  "permissions": ["tabs", "storage", "tabGroups"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
  },
  "icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" },
  "background": { "service_worker": "background.js" }
}
```

**Permission rationale:**
- `tabs` — query all tabs (title, URL, windowId, index), move tabs between windows, close duplicates, group tabs.
- `storage` — persist user settings, API keys, request counts, bridge communication.
- `tabGroups` — create/update colored named tab groups (Tab Stacks mode).

**No `host_permissions` needed** — API calls go through `fetch()` from the popup context, gated by the CSP `connect-src` directive.

---

## 4. Popup UI (popup.html + popup.js)

### 4.1 Visual Design

- **Fixed width:** 460px, min-height 480px.
- **Background:** `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` — purple-to-blue gradient.
- **Card:** Single `.card` container with `backdrop-filter: blur(12px)`, semi-transparent white background, 14px border-radius.
- **Font:** `'Segoe UI', system-ui, -apple-system, sans-serif`.
- **Color scheme:** White text on purple/blue gradient. Inputs have semi-transparent white backgrounds with subtle white borders.
- **All CSS is inline** in `popup.html`'s `<style>` block — no external stylesheets.
- **No images** for UI chrome — dropdown arrows use pure CSS border-triangle technique (`.select-wrap::after`).
- Custom scrollbar styling (thin, white-ish on transparent track).

### 4.2 UI Elements — Full Inventory

Listed top-to-bottom as they appear in the popup:

1. **Title:** `🚀 AI Tab Sorter` (h1, centered)

2. **AI Provider dropdown** (`#providerSelect`):
   - Options: `Google Gemini`, `OpenAI GPT`, `Anthropic Claude`
   - Values: `gemini`, `openai`, `claude`
   - Changing this shows/hides the corresponding API key and model sections.

3. **Gemini API Key section** (`#geminiKeySection`):
   - Password input (`#apiKey`) with placeholder "Paste your Gemini API key"
   - Toggle visibility button (👁 / 🙈) — class `.toggle-vis`, `data-target="apiKey"`
   - Key status indicator (`#geminiKeyStatus`) — shows animal codename when key is saved
   - Hint with link to Google AI Studio

4. **OpenAI API Key section** (`#openaiKeySection`, hidden by default):
   - Same pattern as Gemini: password input (`#openaiKey`), toggle, status indicator (`#openaiKeyStatus`)
   - Hint links to OpenAI Platform

5. **Claude API Key section** (`#claudeKeySection`, hidden by default):
   - Same pattern: password input (`#claudeKey`), toggle, status indicator (`#claudeKeyStatus`)
   - Hint links to Anthropic Console

6. **Gemini Model dropdown** (`#modelSection`):
   - Default options: `gemini-2.0-flash (Recommended)`, `gemini-1.5-flash (Stable)`, `gemini-1.5-pro (Advanced)`
   - Has a **Refresh Available Models** button (`#refreshModelsBtn`) that fetches the live model list from the Gemini API.

7. **OpenAI Model dropdown** (`#openaiModelSection`, hidden by default):
   - Options: `gpt-4o-mini (Recommended)`, `gpt-4o (Advanced)`, `gpt-4.1-mini (Latest)`, `gpt-4.1-nano (Fast)`

8. **Claude Model dropdown** (`#claudeModelSection`, hidden by default):
   - Options: `claude-sonnet-4-20250514 (Recommended)`, `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022 (Fast)`

9. **Categories input** (`#categories`):
   - Text input with placeholder: `Work, Shopping, Research, Social, Entertainment`
   - Comma-separated list
   - Input is sanitized via `sanitizeHtmlTags()` on every keystroke

10. **Custom Rules textarea** (`#logicRules`):
    - 2 rows, placeholder: `e.g., Put YouTube in Entertainment unless title mentions 'Tutorial', then put in Work`
    - Also sanitized via `sanitizeHtmlTags()`

11. **Toggle checkboxes:**
    - `Remove duplicate tabs before sorting` (`#removeDuplicates`)
    - `Create group for uncategorized tabs` (`#includeUncategorized`)

12. **Organization Mode** — radio button group (`name="mode"`):
    - 🏆 **Workspaces** (`value="workspaces"`) — "Create Vivaldi Workspaces per category"
    - 📚 **Tab Stacks** (`value="stacks"`, checked by default) — "Vivaldi tab stacks via chrome.tabGroups API"
    - 🪟 **Separate Windows** (`value="windows"`) — "One window per category"

13. **Stack Scope** (`#stackOptionsSection`, shown only when mode=stacks):
    - Radio: `Current Window` / `All Windows` (`name="stackScope"`)

14. **Workspace Scope** (`#workspaceScopeSection`, shown only when mode=workspaces):
    - Radio: `Current Window` / `All Windows` (`name="workspaceScope"`)

15. **Workspace Setup** (`#workspaceSetupSection`, shown only when mode=workspaces):
    - Bridge status indicator (`#bridgeStatus`)
    - Check Connection button (`#checkBridgeBtn`)
    - Setup area (`#bridgeSetupArea`, shown when bridge not detected):
      - Download Install Script button (`#downloadSetupBtn`)
      - Copy Install Commands button (`#copyCommandsBtn`)
      - Hint with link to INSTALL.md
    - `Reassign tabs already in a workspace` checkbox (`#reassignExisting`, checked by default)

16. **Action buttons:**
    - 🔍 **Analyze** (`#analyzeBtn`) — starts AI analysis
    - ✨ **Apply** (`#applyBtn`, disabled until analysis done) — organizes tabs
    - 🔄 **Reset** (`#resetBtn`, disabled until analysis done) — clears analysis results

17. **Usage bar** (`#usageInfo`, hidden when count=0):
    - Shows: `📊 Today: X/1400 requests (Y%)`
    - Color-coded: green ≤60%, orange 60-80%, red >80%
    - Reset Counter link (`#resetCounter`)

18. **Preview area** (`#preview`, hidden until analysis):
    - `📊 Preview` heading
    - Rows: category name + tab count (e.g., `Work` — `12 tabs`)
    - Footer: `Total: N tabs`

19. **Auto-close toggle:**
    - `Auto-close popup after applying (5s)` (`#autoClose`, unchecked by default)

20. **Export / Import row:**
    - 💾 Export Settings button (`#exportBtn`)
    - 📂 Import Settings button (`#importBtn`) — triggers hidden file input (`#importFile`, accepts `.json`)

21. **Status bar** (`#status`, hidden by default):
    - Shows messages with colored backgrounds: green (success), red (error), blue (info)

### 4.3 Settings Persistence

All settings are saved to `chrome.storage.local` on every change. The following keys are persisted:

| Storage Key | Type | Default | Description |
|---|---|---|---|
| `apiKey` | string | `''` | Gemini API key |
| `openaiKey` | string | `''` | OpenAI API key |
| `claudeKey` | string | `''` | Claude API key |
| `provider` | string | `'gemini'` | Active AI provider (`gemini`, `openai`, `claude`) |
| `selectedModel` | string | `'gemini-2.0-flash'` | Gemini model name |
| `openaiModel` | string | `'gpt-4o-mini'` | OpenAI model name |
| `claudeModel` | string | `'claude-sonnet-4-20250514'` | Claude model name |
| `categories` | string | `''` | Comma-separated category names |
| `logicRules` | string | `''` | Free-text custom rules |
| `mode` | string | `'stacks'` | Organization mode |
| `stackScope` | string | `'current'` | Stack scope (`current` or `all`) |
| `workspaceScope` | string | `'all'` | Workspace scope (`current` or `all`) |
| `removeDuplicates` | boolean | `false` | Whether to dedup tabs before analysis |
| `includeUncategorized` | boolean | `false` | Whether to create group for uncategorized |
| `reassignExisting` | boolean | `true` | Whether to reassign tabs already in a workspace |
| `autoClose` | boolean | `false` | Whether to auto-close popup 5s after applying |
| `requestCount` | number | `0` | Daily API request counter |
| `lastResetDate` | string | today | Date string for daily counter reset |
| `modelsFetched` | boolean | `false` | Whether Gemini models have been auto-fetched |
| `lastKnownVivaldiVersion` | string | — | For detecting Vivaldi updates |

Settings are loaded in `_loadSettings()` during initialization and written in `_save()` on every change.

### 4.4 Provider Switching

When the provider dropdown changes:
1. The corresponding API key section is shown; others are hidden.
2. The corresponding model dropdown is shown; others are hidden.
3. This is handled by `_updateProviderFields()` which toggles `display: none` vs `''` on six sections (3 key sections + 3 model sections).

### 4.5 Browser Detection

`_detectBrowser()` checks `navigator.userAgent` for "Vivaldi":

**In Chrome:**
- "Tab Stacks" is renamed to "Tab Groups" in the UI.
- Description changes to "Chrome tab groups with color labels".
- Workspaces radio button is **disabled** with 50% opacity and text "Not available in Chrome".

**In Vivaldi:**
- Tab Stacks description is enhanced: "Vivaldi tab stacks with color-coded labels (supports tab piling)".
- Workspaces mode is fully available.
- Vivaldi version detection: on init, checks if the Vivaldi version has changed since last run; if so, shows a warning about re-injecting the bridge script.

---

## 5. AI Integration

### 5.1 Prompt Construction

`_buildPrompt(tabsInfo)` constructs the prompt sent to the AI:

```
Categorize each browser tab into exactly ONE of these categories: Work, Shopping, Research.

Use the EXACT category names listed above. Every tab MUST be assigned to one of these categories; do not skip any tab.

Use BOTH the tab title and the URL to determine the best category. The title describes the specific content (e.g. a YouTube video about music production vs. one about gaming). The URL/domain shows the site. Both matter equally — same domain can belong to different categories depending on the title.

Always pick the closest matching category. Never leave a tab uncategorized if any category is even a partial match.

[Custom rules if provided]

Tabs:
[JSON array of {id, title, url}]

Return ONLY a JSON array with one entry per tab: [{"id":<tab_id>,"category":"<Category>"},…]
```

Key design decisions:
- Title and URL are weighted **equally** — the same domain (e.g., YouTube) can go to different categories depending on the video title.
- AI is told to never leave tabs uncategorized; always pick the closest match.
- Custom rules are appended as `\n\nCustom rules:\n{rules}`.
- The tabs are sent as pretty-printed JSON (`JSON.stringify(tabsInfo, null, 2)`).

### 5.2 Google Gemini Provider

**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`

**Request:**
```json
{
  "contents": [{ "parts": [{ "text": "<prompt>" }] }],
  "generationConfig": {
    "temperature": 0.2,
    "topK": 40,
    "topP": 0.95,
    "maxOutputTokens": 8192
  }
}
```

**Response parsing:** `data.candidates[0].content.parts[0].text`

**Model fetching:** `_fetchModels()` calls `GET /v1beta/models?key={key}`, filters models that support `generateContent` and contain "gemini" in the name. Populates the dropdown dynamically. Auto-fetched once on first init if a Gemini key is present.

**API key validation:** Gemini keys must start with `"AI"` and be at least 35 characters long.

### 5.3 OpenAI Provider

**Endpoint:** `https://api.openai.com/v1/chat/completions`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {openaiKey}
```

**Request:**
```json
{
  "model": "gpt-4o-mini",
  "messages": [{ "role": "user", "content": "<prompt>" }],
  "temperature": 0.2
}
```

**Response parsing:** `data.choices[0].message.content`

### 5.4 Anthropic Claude Provider

**Endpoint:** `https://api.anthropic.com/v1/messages`

**Headers:**
```
Content-Type: application/json
x-api-key: {claudeKey}
anthropic-version: 2023-06-01
anthropic-dangerous-direct-browser-access: true
```

The `anthropic-dangerous-direct-browser-access: true` header is required because the call is made directly from the browser, not a server.

**Request:**
```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 8192,
  "messages": [{ "role": "user", "content": "<prompt>" }]
}
```

**Response parsing:** `data.content[0].text`

### 5.5 Response Parsing

`_parseResponse(text, origTabs)` extracts the JSON categorization from the AI's text response. This is critical because AI models inconsistently format their output.

**Pre-processing:** Strip an outer markdown code fence if the entire response is wrapped in ` ```json ... ``` `:
```
/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```\s*$/
```

**Four extraction strategies (tried in order):**

1. **Markdown code block (inner fences):** `/```(?:json)?\s*(\[[\s\S]*?\])\s*```/`
2. **Backtick split:** If text contains ` ``` `, split by it, take the second part, strip leading `json`.
3. **Greedy array extraction:** `/\[[\s\S]*\]/` — find anything that looks like a JSON array.
4. **Entire cleaned text** — try parsing the whole thing.

**Truncated JSON recovery:** If `JSON.parse()` fails, `_repairTruncatedJSON(json)` attempts to salvage partial data:
1. Find the last `}` in the text.
2. Take everything from the first `[` to that `}`.
3. Remove any trailing comma.
4. Close with `]`.
5. Try `JSON.parse()` on the repaired string.

**Post-parsing normalization:**
- Filter items that have both `id` and `category` fields.
- **ID coercion:** `Number(i.id)` — AI sometimes returns string IDs like `"123"` instead of `123`.
- **Case-insensitive category matching:** Build a `catNorm` map of `lowercaseCategory → originalCategory`. If the AI returns "work" but the user defined "Work", it resolves correctly.
- **Whitespace trimming:** `cat.trim()` on each category from the AI.
- Any tab not matched to a category goes to `"Uncategorized"`.

### 5.6 Chunked Analysis

For large numbers of tabs, `_callAIChunked(tabs)`:
- If tab count ≤ `CHUNK_THRESHOLD` (100): single AI call.
- If > 100: split into chunks of `CHUNK_SIZE` (80 tabs each).
- Each chunk gets its own AI call with a progress status message: `"Analyzing chunk X/Y…"`.
- Results are merged across all chunks.

### 5.7 Rate Limiting & Retry Logic

**Client-side throttle:** `RPM_INTERVAL_MS = 4000` (4 seconds between requests = 15 RPM). Before each analysis, if the last request was less than 4 seconds ago, the extension waits.

**Daily limit:** `DAILY_LIMIT = 1400` (under Google's 1,500/day free-tier cap). If reached, analysis is blocked with an error message.

**Retry logic (all three providers):**
- `maxRetries = 2` (total 3 attempts).
- On HTTP 429 or rate-limit error messages: retry with exponential backoff.
  - Gemini: 60s × attempt number.
  - OpenAI / Claude: 30s × attempt number.
- Network/fetch errors also trigger retries.
- Gemini quota errors (`/quota|exceeded/i`) are NOT retried — they throw immediately with a helpful message.

---

## 6. Tab Collection & Processing

### 6.1 Tab Gathering

`_getAllTabs()` calls `chrome.tabs.query({})` (all tabs across all windows) and maps each tab to:

```javascript
{
  id: tab.id,
  title: tab.title || _titleFromUrl(url),
  url: tab.url || tab.pendingUrl || '',
  windowId: tab.windowId,
  index: tab.index
}
```

### 6.2 Hibernated/Discarded Tab Handling

Vivaldi's hibernated (discarded) tabs have special quirks:
- `tab.url` may be **empty** — the real URL is in `tab.pendingUrl`.
- `tab.title` may be **empty** — no page title loaded yet.

**URL fallback:** `const url = t.url || t.pendingUrl || ''` ensures the real URL is used.

**Title derivation from URL:** `_titleFromUrl(url)`:
1. Parse the URL.
2. Take hostname, strip `www.` prefix.
3. If pathname is not just `/`, decode it, replace `/_-` with spaces, trim.
4. Combine as `"hostname – path"`.
5. Example: `https://www.fiverr.com/categories/programming-tech` → `"fiverr.com – categories programming tech"`.
6. If the URL is `about:blank`, the hostname is empty, so it returns `"blank"` (from the pathname).
7. If URL parsing fails, return the raw URL string.

### 6.3 Duplicate Removal

`_dedup(tabs)`:
- Tracks seen URLs in a `Set`.
- Tabs with **empty URLs are never considered duplicates** (they are kept as-is). This prevents all hibernated tabs with empty URLs from collapsing into one.
- Duplicate tabs (same URL seen before) have their IDs collected; they are closed via `chrome.tabs.remove(dupeIds)`.
- Returns the unique tab list.

---

## 7. Organization Modes

### 7.1 Tab Stacks / Groups Mode

`_applyStacks()` uses `chrome.tabs.group()` and `chrome.tabGroups.update()`:

**Scope: Current Window:**
1. Get the last focused *normal* browser window via `chrome.windows.getLastFocused({ windowTypes: ['normal'] })`. This avoids selecting the popup's own window (type `"popup"`).
2. Re-query live tabs in that window and match by ID against the analyzed tabs.
3. For each category with matching tabs: create a tab group, set title and color.

**Scope: All Windows:**
1. Get all normal browser windows via `chrome.windows.getAll({ windowTypes: ['normal'] })`.
2. Pick `windows[0]` as the target window (guaranteed to be a normal browser window, not the popup).
3. Move tabs from other windows into the target window individually (`chrome.tabs.move(tabId, { windowId, index: -1 })`). Failures (pinned/system tabs) are logged and skipped.
4. Re-query tabs in the target window to get fresh state.
5. Then group as usual.

**Grouping:**
- Verify each tab still exists (`chrome.tabs.get()`) before grouping — tabs might have been closed.
- `chrome.tabs.group({ createProperties: { windowId: targetWin }, tabIds: ids })` creates the group, specifying the target window explicitly.
- `chrome.tabGroups.update(gid, { title: categoryName, color: GROUP_COLORS[i], collapsed: false })`.

**Color assignment:** `GROUP_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan']`. Colors cycle through this array for successive categories.

**Uncategorized:** Skipped unless `includeUncategorized` is true.

**After grouping:** `chrome.windows.update(targetWin, { focused: true })` brings the window to front.

### 7.2 Workspaces Mode

Workspace organization is delegated to the **background service worker** via `chrome.runtime.sendMessage()`:

```javascript
{
  action: 'organizeToWorkspaces',
  categorizedTabs: this.analyzedTabs,
  scope: this.workspaceScope,
  includeUncategorized: this.includeUncategorized,
  reassignExisting: this.reassignExisting
}
```

The background script tries three approaches in order:
1. **Direct Vivaldi API** (`vivaldi.workspaces`)
2. **Private Vivaldi API** (`vivaldi.workspacesPrivate`)
3. **Bridge communication** via `chrome.storage`

See [Section 8](#8-background-service-worker-backgroundjs) for full details.

### 7.3 Windows Mode

`_applyWindows()`:

For each category with tabs:
1. Create a new window: `chrome.windows.create({ focused: false })`.
2. Move category tabs individually: `chrome.tabs.move(tabId, { windowId, index: -1 })`. Failures (pinned/system tabs) are logged and skipped.
3. Remove the blank "New Tab" that `chrome.windows.create()` automatically opens. Detects both Chrome (`chrome://newtab/`) and Vivaldi (`vivaldi://startpage/`, `vivaldi://newtab/`) start pages.
4. If no tabs could be moved, close the empty window and skip to the next category.
5. Group all tabs in the new window and label with the category name + color, specifying `windowId` explicitly.

**Important edge case:** The extension does NOT pass `tabId` to `chrome.windows.create()` because if that tab is the last in its source window, the source window closes unexpectedly.

---

## 8. Background Service Worker (background.js)

### 8.1 Message Handling

Listens for three message types:

| Action | Sender | Behavior |
|--------|--------|----------|
| `organizeToWorkspaces` | popup.js | Organize tabs into Vivaldi Workspaces |
| `checkWorkspaceSupport` | popup.js | Detect if Workspace API is available |
| `getBridgeScript` | popup.js | Return the embedded bridge script content |

All handlers return `true` to indicate async response (except `getBridgeScript` which is synchronous).

### 8.2 Workspace Support Detection

`checkWorkspaceSupport()` tries three methods:

1. **Direct API:** Check `typeof vivaldi !== 'undefined' && vivaldi.workspaces`. Try `vivaldi.workspaces.getAll()` — if it succeeds, return `{ available: true, method: 'direct' }`.

2. **Private API:** Check `vivaldi.workspacesPrivate`. Try `.getAll()` — if it succeeds, return `{ available: true, method: 'direct-private' }`.

3. **Bridge ping:** Write `{ action: 'test', timestamp: Date.now() }` to `chrome.storage.local` key `workspaceCommand`. Wait 1500ms. Read `workspaceCommandResult`. If `res.success === true` and `res.timestamp` is recent (within 5s), return `{ available: true, method: 'bridge' }`. Clean up storage keys.

If all fail: `{ available: false, method: 'none' }`.

### 8.3 Workspace Organization — Direct API

`organizeViaDirect(categorized, scope, includeUncategorized, reassignExisting, wsApi?)`:

1. Get all existing workspaces via `api.getAll()`.
2. Build `nameToId` map: `workspace.title → workspace.id`.
3. If scope is `'current'`, get the last focused window's ID.
4. For each category:
   - Skip empty categories.
   - Skip `"Uncategorized"` unless `includeUncategorized`.
   - Find or create workspace by name.
   - For each tab:
     - If scope is `current` and tab is in a different window, skip.
     - If `!reassignExisting`: check `tab.vivExtData` for existing workspace assignment. If already assigned (`ext.group` is set), skip.
     - Move tab: try `api.addTab(wsId, tabId)`, fallback to `vivaldi.tabsPrivate.setWorkspace(tabId, wsId)`.

### 8.4 Workspace Organization — Bridge

`organizeViaBridge(categorized, scope, includeUncategorized, reassignExisting)`:

1. Write to `chrome.storage.local`:
   ```javascript
   workspaceCommand: {
     action: 'organize',
     categorizedTabs: categorized,
     includeUncategorized,
     reassignExisting,
     scope,
     timestamp: Date.now()
   }
   ```
2. Wait 2000ms.
3. Read `workspaceCommandResult`.
4. If recent and successful, clean up and return.
5. If not responding, throw error.

### 8.5 Embedded Bridge Script Content

`BRIDGE_SCRIPT_CONTENT` is a long template literal string containing the complete bridge script. This is used by the popup's "Download Install Script" feature — the popup asks the background for this content via `getBridgeScript` message, then embeds it into the generated installer script.

### 8.6 Lifecycle

`chrome.runtime.onInstalled` listener logs `"Vivaldi AI Tab Sorter installed."` on install.

---

## 9. Vivaldi Bridge (ai_bridge.js)

### 9.1 How It Works

`ai_bridge.js` is a standalone IIFE script that must be injected into Vivaldi's internal `window.html` file. It runs in the context of Vivaldi's UI process, where `vivaldi.workspaces` is available.

On load:
1. Check if `vivaldi.workspaces` is available. If not, warn and exit.
2. Listen for `chrome.storage.onChanged` events on the `workspaceCommand` key.

### 9.2 Communication Protocol

The bridge uses `chrome.storage.local` as a message bus:

**Extension → Bridge:**
- Write to key `workspaceCommand`: `{ action: 'test' | 'organize', ... }`

**Bridge → Extension:**
- Write to key `workspaceCommandResult`: `{ success: boolean, error?: string, timestamp: number }`

**Actions:**
- `test`: Bridge responds with `{ success: true, message: 'Bridge OK' }`.
- `organize`: Bridge calls its internal `organise()` function, then responds with `{ success: true }` or `{ success: false, error: '...' }`.

**Bridge's organise function:**
1. Get all existing workspaces.
2. For each category: find or create workspace by name.
3. Move tabs via `vivaldi.workspaces.addTab()` or `vivaldi.tabsPrivate.setWorkspace()`.

### 9.3 Bridge Installation

The bridge must be manually installed into Vivaldi's resources directory:

**Windows:** `%LOCALAPPDATA%\Vivaldi\Application\<version>\resources\vivaldi\`
**macOS:** `/Applications/Vivaldi.app/Contents/Versions/<ver>/Vivaldi Framework.framework/Resources/vivaldi/`
**Linux:** `/opt/vivaldi/resources/vivaldi/` (or `/usr/lib/vivaldi/`, snap, flatpak paths)

Steps:
1. Close Vivaldi completely.
2. Back up `window.html`.
3. Copy `ai_bridge.js` to the vivaldi resources directory.
4. Add `<script src="ai_bridge.js"></script>` before `</body>` in `window.html`.
5. Restart Vivaldi.

**IMPORTANT:** The bridge must be re-installed after every Vivaldi update (the files are overwritten).

---

## 10. Bridge Installer Script Generation

The popup can generate OS-specific installer scripts on the fly. `_downloadSetup()`:

1. Detect OS from user agent (Win/Mac/Linux).
2. Get bridge code from background via `getBridgeScript` message.
3. Generate the appropriate script:
   - **Windows:** `_genPowerShell(ver, bridgeCode)` → `install_bridge.ps1`
   - **macOS:** `_genBashMac(ver, bridgeCode)` → `install_bridge.sh`
   - **Linux:** `_genBashLinux(bridgeCode)` → `install_bridge.sh`
4. Trigger download via Blob URL + invisible `<a>` element.

**Critical implementation detail:** The bridge code is embedded verbatim into:
- PowerShell: `@'...'@` (literal here-string — no escaping needed)
- Bash: `<< 'BRIDGEOF' ... BRIDGEOF` (quoted heredoc — no escaping needed)

Each generated script:
1. Checks if Vivaldi is running (refuses to proceed if so).
2. Finds the Vivaldi resources directory.
3. Creates a backup of `window.html`.
4. Writes `ai_bridge.js`.
5. Patches `window.html` to include the `<script>` tag (idempotent — skips if already present).
6. Runs verification checks.

---

## 11. Export / Import Settings

### Export (`_exportSettings()`)

Generates a JSON file with format:
```json
{
  "_format": "vivaldi-ai-tab-sorter-settings",
  "_version": 1,
  "_exported": "2024-01-15T10:30:00.000Z",
  "keys": { "gemini": "AI...", "openai": "sk-...", "claude": "sk-ant-..." },
  "provider": "gemini",
  "models": { "gemini": "gemini-2.0-flash", "openai": "gpt-4o-mini", "claude": "claude-sonnet-4-20250514" },
  "categories": "Work, Shopping, Research",
  "logicRules": "...",
  "mode": "stacks",
  "stackScope": "current",
  "workspaceScope": "all",
  "removeDuplicates": false,
  "includeUncategorized": false,
  "reassignExisting": true,
  "autoClose": false
}
```

Downloaded as `tab-sorter-settings.json` via Blob URL.

### Import (`_importSettings()`)

Reads the JSON file, validates `_format === 'vivaldi-ai-tab-sorter-settings'`, and restores all settings.

**Backward compatibility:** The import supports old key names from a previous version:
- `data.keys.fox` → Gemini key
- `data.keys.owl` → OpenAI key
- `data.keys.dolphin` → Claude key

New format uses `gemini`, `openai`, `claude` as key names.

---

## 12. Request Tracking & Usage

- `requestCount` and `lastResetDate` are stored in `chrome.storage.local`.
- On load: if `lastResetDate !== today`, reset counter to 0.
- After each successful AI call: `_bumpCount()` increments and persists.
- Usage bar shows count/limit with color-coded percentage.
- Manual reset via "Reset Counter" button.

---

## 13. Security & Content Security Policy

**CSP meta tag in popup.html:**
```
default-src 'self';
style-src 'self' 'unsafe-inline';
connect-src https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com
```

- `default-src 'self'` — scripts can only load from extension itself.
- `style-src 'self' 'unsafe-inline'` — inline styles are allowed (all CSS is in the HTML `<style>` block).
- `connect-src` — fetch() can only reach the three AI API domains.
- No `img-src` directive — falls back to `'self'` (only local icons).

**Input sanitization:**
- `sanitizeHtmlTags(str)`: Loops `str.replace(/<[^>]*>/g, '')` until stable. Strips all HTML tags from user input (categories and logicRules). The loop prevents nested/recursive tag attacks.
- `sanitizeErrorMessage(msg)`: Redacts API keys matching `/AI[a-zA-Z0-9_-]{28,}/g` → `[REDACTED]`. Redacts URLs with query params → `[URL]`. Truncates to 250 chars.

**DOM safety:**
- All dynamic content uses `textContent` (never `innerHTML`).
- `replaceChildren()` for clearing/building DOM nodes.
- Preview rows, status messages, and usage bars all build DOM elements programmatically.

---

## 14. Animal Codenames System

```javascript
const ANIMAL_CODENAMES = [
  { emoji: '🦊', name: 'Fox' },
  { emoji: '🦉', name: 'Owl' },
  { emoji: '🐬', name: 'Dolphin' },
  { emoji: '🦜', name: 'Parrot' },
  { emoji: '🐺', name: 'Wolf' },
];
```

These are **sequential visual identifiers for saved API keys**, NOT tied to any provider. The first key that has a value gets "Fox", the second gets "Owl", etc.

`_updateKeyStatus()` iterates through the three key status indicators (gemini, openai, claude). For each that has a value, it shows `✓ {emoji} {name}` in green next to the label.

Example: If only Gemini and Claude keys are set:
- Gemini shows: `✓ 🦊 Fox`
- Claude shows: `✓ 🦉 Owl`
- OpenAI shows: nothing

---

## 15. Setup Scripts (install.sh / install.ps1)

Two standalone installer scripts included in the build ZIP for one-click setup:

### install.sh (macOS / Linux)

1. Verify source files exist (manifest.json, popup.html, popup.js, background.js).
2. Copy all extension files to permanent directory:
   - macOS: `~/Library/Application Support/vivaldi-ai-tab-sorter/`
   - Linux: `~/.local/share/vivaldi-ai-tab-sorter/`
3. Detect Vivaldi installation and install bridge (if found):
   - macOS: `/Applications/Vivaldi.app/Contents/Versions/...`
   - Linux: tries `/opt/vivaldi/`, `/usr/lib/vivaldi/`, snap, flatpak paths
   - Backs up `window.html`, copies `ai_bridge.js`, patches HTML.
4. Copy install path to clipboard (pbcopy on Mac, xclip/xsel on Linux).
5. Open browser's extensions page.
6. Print final instructions.

### install.ps1 (Windows)

Same flow for Windows:
- Install dir: `%LOCALAPPDATA%\vivaldi-ai-tab-sorter`
- Vivaldi path: `%LOCALAPPDATA%\Vivaldi\Application\<version>\resources\vivaldi`
- Uses PowerShell's `Set-Clipboard`, `Start-Process`

### install.bat / install.command

Thin wrappers:
- `install.bat`: `PowerShell -ExecutionPolicy Bypass -File install.ps1`
- `install.command`: `cd "$(dirname "$0")" && exec bash install.sh`

---

## 16. Build & CI Pipeline

### Local build (build.sh)

```bash
bash build.sh              # validate → test → package
bash build.sh --skip-tests # skip validation, just package
```

Requires `node` and `zip`. Reads version from manifest.json. Creates `dist/vivaldi-ai-tab-sorter-v{version}.zip` containing:
- manifest.json, popup.html, popup.js, background.js, ai_bridge.js
- install.bat, install.command, install.sh, install.ps1
- icons/*.png
- LICENSE, README.md

### CI: build.yml (every push)

Runs on `ubuntu-latest` with Node 20:
1. `bash validate.sh`
2. `node test/parser.test.js`
3. Read version from manifest
4. Create `.zip`
5. Upload as artifact (90-day retention)

### CI: release.yml (on v* tags)

Same steps, plus:
- Creates a GitHub Release via `softprops/action-gh-release@v2`
- Attaches the `.zip` as a release asset
- Generates release notes automatically

---

## 17. Testing

**Test file:** `test/parser.test.js` (runs under Node.js, no dependencies)

The test file **duplicates** the pure functions from `popup.js` at the top:
- `sanitizeHtmlTags()`
- `sanitizeErrorMessage()`
- `buildPrompt()`
- `parseResponse()` (standalone version that takes `categories` as parameter)
- `repairTruncatedJSON()`
- `titleFromUrl()`
- `dedup()` (adapted for Node — no `chrome.tabs.remove()`)
- `getAllTabs()` (adapted for Node)

Test runner is a simple custom harness:
```javascript
let pass = 0, fail = 0;
function assert(cond, msg) { ... }
function assertThrows(fn, msg) { ... }
```

**Test categories covered:**
- parseResponse: clean JSON, markdown fences, mixed text, case-insensitive categories, string IDs, whitespace handling, truncated JSON recovery, empty arrays, missing fields, completely invalid responses
- buildPrompt: with/without custom rules, category list formatting
- sanitizeHtmlTags: simple tags, nested tags, recursive/adversarial patterns
- sanitizeErrorMessage: API key redaction, URL redaction, length truncation
- titleFromUrl: normal URLs, about:blank, data URIs, empty strings, complex paths
- dedup: normal dedup, empty-URL handling (should keep all empty-URL tabs)
- getAllTabs: pendingUrl fallback, title derivation from URL

---

## 18. Constants & Configuration Values

| Constant | Value | Purpose |
|----------|-------|---------|
| `GEMINI_API_BASE` | `https://generativelanguage.googleapis.com/v1beta` | Gemini API root |
| `GROUP_COLORS` | `['grey','blue','red','yellow','green','pink','purple','cyan']` | Tab group color rotation |
| `RPM_INTERVAL_MS` | `4000` | Minimum ms between API requests (15 RPM) |
| `DAILY_LIMIT` | `1400` | Daily request cap (under Google's 1500 free tier) |
| `CHUNK_THRESHOLD` | `100` | Max tabs for single AI call |
| `CHUNK_SIZE` | `80` | Tabs per chunk when splitting |

---

## 19. Complete Data Flow — End to End

### Analyze Flow

1. User clicks **Analyze**.
2. Validation: check active provider has API key, categories are non-empty, daily limit not reached.
3. Rate-limit throttle: if last request < 4s ago, wait.
4. Disable Analyze button, show "Collecting tabs…" status.
5. `_getAllTabs()`: query all tabs, map to `{id, title, url, windowId, index}`, handle hibernated tabs.
6. Optional dedup: if enabled, remove duplicate-URL tabs (close them), show count.
7. `_callAIChunked(tabs)`: if ≤100 tabs, single call; else split into 80-tab chunks.
8. For each chunk, `_callAI(tabs)`:
   - Build prompt with categories + rules + tab data.
   - Call selected provider (Gemini/OpenAI/Claude).
   - Parse response: extract JSON, normalize categories, coerce IDs.
   - Return `{ categoryName: [tabObjects], ..., Uncategorized: [...] }`.
9. Merge chunk results.
10. Show preview (category → tab count).
11. Enable Apply and Reset buttons.
12. Show "Analysis complete" status.

### Apply Flow

1. User clicks **Apply**.
2. Disable Apply button, show "Applying…" status.
3. Based on `mode`:
   - **workspaces**: send message to background service worker.
   - **stacks**: group tabs in current or all windows.
   - **windows**: create window per category, move tabs.
4. Show "✅ Tabs sorted!" status.
5. If auto-close enabled, `setTimeout(() => window.close(), 5000)`.

### Reset Flow

1. User clicks **Reset**.
2. Clear `analyzedTabs` and `allTabs`.
3. Clear preview DOM and hide it.
4. Disable Apply and Reset buttons.
5. Show "Reset – ready for a new analysis" status.

---

## 20. Edge Cases & Error Handling

### Tab Edge Cases
- **Hibernated tabs** with empty `url`: use `pendingUrl` fallback.
- **Hibernated tabs** with empty `title`: derive title from URL via `_titleFromUrl()`.
- **about:blank** tabs: URL parsed, hostname is empty, title derived as `"blank"` from the pathname.
- **Tabs closed during analysis**: `_applyStacks()` verifies each tab still exists with `chrome.tabs.get()` before grouping.
- **Empty-URL tabs and dedup**: tabs with no URL are never considered duplicates — they always pass through.
- **Tab as last in window**: Window mode doesn't pass `tabId` to `chrome.windows.create()` to avoid closing the source window.
- **Popup window context**: The extension popup opens in its own window (type `"popup"`). `chrome.windows.getCurrent()` returns this popup window, NOT the user's browser window. All modes use `chrome.windows.getLastFocused({ windowTypes: ['normal'] })` or `chrome.windows.getAll({ windowTypes: ['normal'] })` to target real browser windows.
- **Pinned/system tabs**: Cannot be moved cross-window. Tab Stacks and Windows modes move tabs individually and skip failures, rather than failing the entire batch.
- **Vivaldi start page**: `chrome.windows.create()` opens a blank tab. In Vivaldi this may be `vivaldi://startpage/` or `vivaldi://newtab/` rather than `chrome://newtab/`. Both are detected and removed.
- **Empty windows**: If no tabs could be moved into a new window (all were pinned/system), the empty window is automatically closed.

### AI Response Edge Cases
- **Markdown code fences**: stripped in pre-processing and multiple extraction strategies.
- **Truncated JSON**: recovered by finding the last complete `}` object and closing the array.
- **String IDs**: `Number()` coercion matches string `"123"` to numeric tab ID `123`.
- **Case mismatches**: case-insensitive lookup map resolves `"work"` → `"Work"`.
- **Extra whitespace**: `.trim()` on all categories from AI responses.
- **Empty responses**: throw descriptive errors.
- **Non-JSON responses**: throw "Could not find JSON in AI response".

### API Edge Cases
- **Rate limiting**: exponential backoff retry (up to 2 retries).
- **Quota exceeded** (Gemini only): immediate failure with helpful message (no retry — it won't help).
- **Network errors**: retried like rate limits.
- **Invalid API key format** (Gemini): pre-validated (must start with "AI", ≥35 chars).

### Workspace Edge Cases
- **No workspace API**: falls back through direct → private → bridge → error.
- **Bridge not responding**: 2-second timeout, then error.
- **Already-assigned tabs**: `reassignExisting` toggle controls whether to move tabs that are already in a workspace.
- **Vivaldi version change**: detected and flagged with a warning to re-inject the bridge.

### Security Edge Cases
- **XSS via category names**: sanitized with `sanitizeHtmlTags()`.
- **XSS via custom rules**: same sanitization.
- **API key exposure in errors**: redacted by `sanitizeErrorMessage()`.
- **URL exposure in errors**: redacted.
- **CSP violation**: only allowed domains can be contacted.
- **No innerHTML anywhere**: all DOM is built with `textContent` and programmatic element creation.

---

*End of specification.*
