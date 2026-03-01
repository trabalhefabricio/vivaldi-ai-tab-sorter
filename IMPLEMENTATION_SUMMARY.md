# Implementation Summary – Vivaldi AI Tab Sorter v2.0

## Architecture

```
popup.html          UI (HTML + CSS)
popup.js            TabSorter class – settings, Gemini API, tab operations
background.js       Service worker – workspace organisation (API + bridge fallback)
ai_bridge.js        Vivaldi bridge – injected into window.html for workspace access
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
- [x] Bridge script for Vivaldi workspace API
- [x] Comprehensive error handling & sanitised messages

## Modes

| Mode | API used | Bridge? |
|------|----------|:-------:|
| Workspaces | `vivaldi.workspaces` via bridge | ✅ |
| Tab Stacks | `chrome.tabGroups` (Chromium API) | ❌ |
| Windows | `chrome.windows.create` | ❌ |

### Vivaldi‑specific notes

- **Tab Stacks** uses Chrome's `chrome.tabGroups` API, which Vivaldi supports as a Chromium‑based browser. This produces labelled, coloured tab groups — visually similar to but not identical to Vivaldi's native tab stacking (compact/two‑level/accordion).
- **Workspaces** uses Vivaldi's native `vivaldi.workspaces` API through a bridge script injected into Vivaldi's `window.html`. This creates real Vivaldi Workspaces visible in the workspace switcher.

## Security

- No `host_permissions` – only `tabs`, `storage`, `tabGroups`.
- API key stored locally; never logged.
- Error messages sanitised to redact keys and URLs.
- HTML tag injection stripped from category input.
