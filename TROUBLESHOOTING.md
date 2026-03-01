# Troubleshooting Guide

## Installation

| Problem | Fix |
|---------|-----|
| Extension won't load | Select the folder with `manifest.json`; ensure Developer mode is ON |
| Manifest error | Run `./validate.sh` to check JSON validity |
| Icons blank | Replace placeholder PNGs in `icons/` folder |

## API Key

| Problem | Fix |
|---------|-----|
| "Enter your API key" | Get one at https://aistudio.google.com/app/apikey |
| Invalid key format | Key must start with `AI` and be 35+ characters |
| API error / quota | Check quota at AI Studio; wait for reset or try tomorrow |

## Workspace Mode

| Problem | Fix |
|---------|-----|
| "⚠️ Bridge not detected" | Click **⬇️ Download Install Script**, run it with Vivaldi closed, then restart Vivaldi |
| Bridge not responding after install | Verify `ai_bridge.js` in Vivaldi's `resources/vivaldi` folder, script tag in `window.html`, and restart Vivaldi |
| Tabs not moving | Unpin tabs; avoid incognito tabs; check console for errors |
| Script blocked by OS | **Windows**: run `Set-ExecutionPolicy Bypass -Scope Process` in PowerShell first. **Linux**: run with `sudo` |

**Verify bridge is loaded:**
```
Open DevTools (F12) → Console → look for "[AI Tab Sorter] Bridge loaded."
```

**Or use the popup:**
Select Workspaces mode → click **🔍 Check Connection**.

## Tab Sorting

| Problem | Fix |
|---------|-----|
| Wrong categories | Add more specific logic rules; reduce categories to 3–5 |
| Some tabs skipped | System tabs (`vivaldi://`, `chrome://`) cannot be moved |
| Duplicates remain | Extension matches exact URLs only |

## Vivaldi‑Specific Notes

- **Tab Stacks mode** uses Chrome's `chrome.tabGroups` API. Vivaldi supports this as a Chromium browser, but the visual result differs from Vivaldi's native tab stacking (compact/accordion). The groups will appear as labelled, coloured sections in your tab bar.
- **Workspaces mode** uses Vivaldi's native `vivaldi.workspaces` API via the bridge script. This creates real Vivaldi Workspaces visible in the workspace switcher.

## AI Response Errors

| Message | Meaning |
|---------|---------|
| "Could not find JSON…" | AI returned text without a JSON array – retry |
| "Invalid JSON…" | Malformed response – try fewer tabs or simpler rules |
| "Empty list" | AI returned `[]` – rephrase categories |
| "Missing id or category" | AI output format wrong – retry |

## Performance

- **200+ tabs** may take 30–60 s to analyse.
- Avoid rapid successive requests (rate limit: 15 req/min).

## After Vivaldi Updates

Re‑run the install script (click **⬇️ Download Install Script** again) or manually re‑add the `<script src="ai_bridge.js"></script>` tag and copy `ai_bridge.js` to the new version's `resources/vivaldi` folder.

## Reset Extension

```js
// In popup DevTools console:
chrome.storage.local.clear();
location.reload();
```

## Diagnostic Checklist

- [ ] Extension installed & enabled
- [ ] Developer mode ON
- [ ] API key entered & valid
- [ ] Categories defined
- [ ] Internet connection working
- [ ] For Workspaces: bridge script installed & Vivaldi restarted
- [ ] No errors in browser console
