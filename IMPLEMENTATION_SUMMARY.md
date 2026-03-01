# Implementation Summary – Vivaldi AI Tab Sorter v2.1

## Architecture

```
popup.html          UI (HTML + CSS)
popup.js            TabSorter class – settings, Gemini API, tab operations, bridge setup wizard
background.js       Service worker – workspace organisation (direct API → bridge fallback), bridge status check
ai_bridge.js        Vivaldi bridge – injected into window.html for workspace access (if needed)
```

## Features Implemented

- [x] Gemini AI categorisation (multi‑model, rate‑limited)
- [x] Three organisation modes (Workspaces, Tab Stacks, Windows)
- [x] Custom categories & natural‑language logic rules
- [x] Duplicate tab removal
- [x] Preview before apply
- [x] Persistent settings (chrome.storage.local)
- [x] Daily request counter with manual reset
- [x] Dynamic model list refresh from Google API
- [x] Auto‑detection of Vivaldi workspace API (direct or bridge)
- [x] One‑click bridge install script generator (Windows, macOS, Linux)
- [x] Bridge status indicator in popup
- [x] Comprehensive error handling & sanitised messages

## Modes

| Mode | API used | Bridge? |
|------|----------|:-------:|
| Workspaces | `vivaldi.workspaces` direct or via bridge | Auto‑detected |
| Tab Stacks | `chrome.tabGroups` (Chromium API) | ❌ |
| Windows | `chrome.windows.create` | ❌ |

### Vivaldi‑specific notes

- **Tab Stacks** uses Chrome's `chrome.tabGroups` API, which Vivaldi supports as a Chromium‑based browser. This produces labelled, coloured tab groups — visually similar to but not identical to Vivaldi's native tab stacking (compact/two‑level/accordion).
- **Workspaces** first tries `vivaldi.workspaces` directly in the service worker. If the API is not exposed to extensions, it falls back to the bridge script injected into Vivaldi's `window.html`.

### Self‑injection

Chromium extensions cannot write to the browser's own files or inject scripts into `vivaldi://` pages. True self‑injection is blocked by the browser security model. Instead the extension provides a **one‑click install script** that the user downloads and runs outside the browser — the script automatically finds Vivaldi's resources, backs up `window.html`, patches it, and writes the bridge file.

## Security

- No `host_permissions` – only `tabs`, `storage`, `tabGroups`.
- API key stored locally; never logged.
- Error messages sanitised to redact keys and URLs.
- HTML tag injection stripped from category input.
- Install scripts only modify Vivaldi's own `window.html` (with backup).
