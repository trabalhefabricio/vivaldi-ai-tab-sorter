# Test Results – v3.0.0

**Date**: 2026-03-01

## Unit Tests

```bash
$ node test/parser.test.js
Results: 38 passed, 0 failed

✅ All tests passed.
```

## Validation

```bash
$ bash validate.sh
✅ All checks passed
```

## Feature Checklist

- [x] Multi‑provider AI categorisation (Gemini, OpenAI, Claude)
- [x] Multi-model support & dynamic model refresh
- [x] Tab chunking for large tab counts (100+ tabs)
- [x] Browser detection (Chrome vs Vivaldi)
- [x] Custom categories (comma-separated)
- [x] Custom logic rules (natural language)
- [x] Duplicate tab removal
- [x] Preview before apply
- [x] Three organisation modes (Workspaces, Tab Stacks, Windows)
- [x] Tab Stack scope option (current window / all windows)
- [x] Workspace scope option (current window / all windows)
- [x] Uncategorized tab toggle
- [x] Reassign existing tabs toggle
- [x] Auto‑close popup toggle
- [x] Auto-detection of Vivaldi workspace API (direct or bridge)
- [x] One-click bridge install script generator (Windows, macOS, Linux)
- [x] Bridge status indicator in popup
- [x] Rate limiting (RPM + daily cap)
- [x] Daily request counter with manual reset
- [x] Persistent settings via chrome.storage.local
- [x] Sanitised error messages (no API key leakage)
- [x] HTML tag stripping on category input
