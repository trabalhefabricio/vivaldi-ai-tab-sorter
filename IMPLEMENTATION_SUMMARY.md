# Implementation Summary – Vivaldi AI Tab Sorter v2.1

Removed bridge dependency — extension now works fully out of the box.

## What Changed in v2.1

- **Removed `ai_bridge.js`** — no more injecting scripts into Vivaldi's `window.html`
- **Removed Workspaces mode** — the only mode that required the bridge
- **Tab Stacks is now the default** — uses native `chrome.tabGroups` API, no bridge needed
- **Simplified `background.js`** — removed all bridge/workspace communication code
- **Updated all documentation** — removed bridge installation instructions

## Architecture

```
popup.html          UI (HTML + CSS)
popup.js            TabSorter class – settings, Gemini API, tab operations
background.js       Service worker – lifecycle only
```

## Features Implemented

- [x] Gemini AI categorisation (multi‑model, rate‑limited)
- [x] Two organisation modes (Tab Stacks, Windows) — no bridge needed
- [x] Custom categories & natural‑language logic rules
- [x] Duplicate tab removal
- [x] Preview before apply
- [x] Persistent settings (chrome.storage.local)
- [x] Daily request counter with manual reset
- [x] Dynamic model list refresh from Google API
- [x] Comprehensive error handling & sanitised messages

## Security

- No `host_permissions` – only `tabs`, `storage`, `tabGroups`.
- API key stored locally; never logged.
- Error messages sanitised to redact keys and URLs.
- HTML tag injection stripped from category input.
- No system file modifications required.
