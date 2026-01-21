# Implementation Plan: Vivaldi-First Extension

## Goal
Rebuild the extension to be **designed for Vivaldi**, not as a Chrome extension adapted for Vivaldi.

## Current Problems
1. Extension tries to use `chrome.tabGroups` (doesn't exist in Vivaldi)
2. Tab Stacks mode fails because it uses Chrome's API
3. Treats Vivaldi as a "port" rather than the primary target
4. Bridge script is a workaround, not the main implementation

## New Approach: Vivaldi-First Design

### Architecture
```
Vivaldi AI Tab Sorter (Vivaldi-First Extension)
├── manifest.json              (Standard Chrome manifest)
├── popup.html / popup.js      (UI - same)
├── background.js              (Simplified - just coordinates)
├── vivaldi-inject.js          (Injects into Vivaldi context)
└── vivaldi-core.js            (Main logic using vivaldi.* APIs)
```

### Key Changes

1. **Remove Chrome API Dependencies**
   - ❌ Remove `chrome.tabGroups` usage
   - ❌ Remove Tab Stacks mode (doesn't work in Vivaldi)
   - ✅ Use only `vivaldi.*` APIs for organization
   - ✅ Keep basic `chrome.tabs`, `chrome.windows`, `chrome.storage`

2. **Vivaldi-Specific Features**
   - ✅ Vivaldi Workspaces as PRIMARY mode
   - ✅ Vivaldi's native tab stacking (not Chrome's)
   - ✅ Separate Windows as fallback
   - ❌ Remove Chrome Tab Groups mode

3. **Simplified Installation**
   - Extension injects itself automatically
   - No manual file editing (if possible)
   - Or provide automated installer script

## Implementation Steps

### Phase 1: Remove Chrome-Specific Code
- [ ] Remove `tabGroups` permission from manifest
- [ ] Remove Tab Stacks mode from popup.js
- [ ] Remove `chrome.tabGroups` API calls
- [ ] Update UI to show only Vivaldi modes

### Phase 2: Implement Auto-Injection
- [ ] Create content script to inject into Vivaldi pages
- [ ] Create injected script with access to `vivaldi.*` APIs
- [ ] Set up communication between extension and injected script
- [ ] Test on actual Vivaldi browser

### Phase 3: Use Vivaldi APIs Directly
- [ ] Use `vivaldi.workspaces` as primary API
- [ ] Use `vivaldi.tabsPrivate` if needed
- [ ] Implement Vivaldi's native tab stacking (if accessible)
- [ ] Remove all Chrome-specific workarounds

### Phase 4: Documentation
- [ ] Update README to say "Vivaldi AI Tab Sorter (Vivaldi-Only)"
- [ ] Remove Chrome compatibility claims
- [ ] Document Vivaldi-specific features
- [ ] Add installation guide for Vivaldi users

## Target User Experience

User opens Vivaldi and:
1. Loads extension (standard unpacked extension)
2. Extension automatically detects it's in Vivaldi
3. Extension auto-injects Vivaldi API bridge
4. User sees two modes:
   - 🏆 Vivaldi Workspaces (default, recommended)
   - 🪟 Separate Windows (fallback)
5. No Tab Stacks mode (doesn't work in Vivaldi)
6. Everything "just works" without manual setup

## Files to Modify

1. **manifest.json**
   - Remove `tabGroups` permission
   - Add content_scripts for auto-injection
   - Add web_accessible_resources

2. **popup.js**
   - Remove Tab Stacks mode UI
   - Remove `chrome.tabGroups` calls
   - Only show Workspaces and Windows modes
   - Update messaging to be Vivaldi-focused

3. **popup.html**
   - Remove Tab Stacks radio button
   - Update text to say "Vivaldi Workspaces" (not just "Workspaces")
   - Make it clear this is a Vivaldi extension

4. **background.js**
   - Remove Chrome-specific fallbacks
   - Focus on Vivaldi API communication
   - Simplify logic

5. **Create vivaldi-inject.js** (NEW)
   - Content script that injects into Vivaldi
   - Detects Vivaldi APIs
   - Injects the core script

6. **Rename ai_bridge.js to vivaldi-core.js**
   - This IS the main implementation, not a "bridge"
   - Contains Vivaldi Workspace logic
   - Accessed via injection

## Benefits of This Approach

1. **Clearer Purpose**: It's a Vivaldi extension, not a Chrome port
2. **Better UX**: No confusing Chrome features that don't work
3. **Simpler Code**: No Chrome API workarounds
4. **More Reliable**: Uses Vivaldi APIs directly
5. **Honest Marketing**: "Made for Vivaldi" not "Chrome extension that works in Vivaldi"

## Timeline

- Phase 1: 30 minutes (remove Chrome code)
- Phase 2: 1 hour (implement auto-injection)
- Phase 3: 30 minutes (optimize Vivaldi APIs)
- Phase 4: 30 minutes (update docs)

**Total: ~2.5 hours to rebuild as Vivaldi-first**

---

Ready to implement?
