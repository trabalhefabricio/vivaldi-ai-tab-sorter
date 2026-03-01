# Test Results – v2.1

**Date**: 2026-03-01

## Validation

```bash
$ bash validate.sh
✅ All checks passed
```

## Feature Checklist

- [x] Gemini AI categorisation
- [x] Multi-model support & dynamic model refresh
- [x] Custom categories (comma-separated)
- [x] Custom logic rules (natural language)
- [x] Duplicate tab removal
- [x] Preview before apply
- [x] Three organisation modes (Workspaces, Tab Stacks, Windows)
- [x] Tab Stack scope option (current window / all windows)
- [x] Auto-detection of Vivaldi workspace API (direct or bridge)
- [x] One-click bridge install script generator (Windows, macOS, Linux)
- [x] Bridge status indicator in popup
- [x] Rate limiting (RPM + daily cap)
- [x] Daily request counter with manual reset
- [x] Persistent settings via chrome.storage.local
- [x] Sanitised error messages (no API key leakage)
- [x] HTML tag stripping on category input
