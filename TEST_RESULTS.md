# Test Results – v2.1 (Bridge Removed)

**Date**: 2026-03-01

## Validation

```bash
$ bash validate.sh
✅ All checks passed
```

## What Changed

- **Removed `ai_bridge.js`** — no more bridge dependency
- **Removed Workspaces mode** — the only feature that needed the bridge
- **Tab Stacks is now the default** — uses native `chrome.tabGroups` API
- **Simplified `background.js`** — lifecycle events only
- **Updated all documentation** — no more bridge installation steps

## Feature Checklist

- [x] Gemini AI categorisation
- [x] Multi-model support & dynamic model refresh
- [x] Custom categories (comma-separated)
- [x] Custom logic rules (natural language)
- [x] Duplicate tab removal
- [x] Preview before apply
- [x] Two organisation modes (Tab Stacks, Windows) — no bridge needed
- [x] Tab Stack scope option (current window / all windows)
- [x] Rate limiting (RPM + daily cap)
- [x] Daily request counter with manual reset
- [x] Persistent settings via chrome.storage.local
- [x] Sanitised error messages (no API key leakage)
- [x] HTML tag stripping on category input
- [x] Zero bridge/system-file dependencies
