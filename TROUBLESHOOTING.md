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
| "Enter your API key" | Get one at your provider's dashboard |
| Invalid key format (Gemini) | Key must start with `AI` and be 35+ characters |
| API error / quota (Gemini) | Check quota at AI Studio; wait for reset or try tomorrow |
| OpenAI API error | Verify your API key at https://platform.openai.com/api-keys and check billing/usage limits |
| Claude API error | Verify your API key at https://console.anthropic.com/ and check usage limits |
| Wrong provider selected | Ensure the provider dropdown matches the API key you've entered |

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

## Tab Stacks / Tab Groups Mode

| Problem | Fix |
|---------|-----|
| "No tabs to organise" | Fixed in v3.0.0 — the popup used to detect its own window instead of the browser window. Now uses `getLastFocused({ windowTypes: ['normal'] })` |
| Tabs not grouping after cross-window move | Fixed — `chrome.tabs.group()` now specifies the target `windowId` explicitly |
| Pinned tabs block entire group | Fixed — each tab is moved individually; failures are logged and skipped |
| Groups appear as Chrome-style labels, not Vivaldi native stacks | Expected — the extension uses `chrome.tabGroups` API. Vivaldi renders these as coloured label sections in the tab bar, not compact/accordion stacks |

## Separate Windows Mode

| Problem | Fix |
|---------|-----|
| No tabs appear in new windows | Fixed in v3.0.0 — batch `chrome.tabs.move()` would fail entirely if any single tab couldn't be moved. Now moves tabs individually |
| Extra blank tab in each window | Fixed — now detects Vivaldi-specific start pages (`vivaldi://startpage/`, `vivaldi://newtab/`) in addition to `chrome://newtab/` |
| Empty windows left behind | Fixed — if no tabs could be moved into a new window, the empty window is now closed automatically |
| Pinned tabs cause errors | Fixed — pinned/system tabs that can't be moved are skipped with a console warning |
| Tab groups not created in new windows | Fixed — `chrome.tabs.group()` now specifies target `windowId` explicitly |

## Tab Sorting

| Problem | Fix |
|---------|-----|
| Wrong categories | Add more specific logic rules; reduce categories to 3–5 |
| Some tabs skipped | System tabs (`vivaldi://`, `chrome://`) cannot be moved; pinned tabs cannot be moved cross-window |
| Duplicates remain | Extension matches exact URLs only |

## Vivaldi‑Specific Notes

- **Tab Stacks mode** uses Chrome's `chrome.tabGroups` API. Vivaldi supports this as a Chromium browser, but the visual result differs from Vivaldi's native tab stacking (compact/accordion). The groups will appear as labelled, coloured sections in your tab bar.
- **Workspaces mode** uses Vivaldi's native `vivaldi.workspaces` API via the bridge script. This creates real Vivaldi Workspaces visible in the workspace switcher.
- **Popup window context** — the extension popup runs in its own window (type `"popup"`). API calls like `chrome.windows.getCurrent()` return the popup window, not the user's browser window. The extension uses `chrome.windows.getLastFocused({ windowTypes: ['normal'] })` to correctly identify the browser window.

## Chrome vs Vivaldi Differences

| Feature | Chrome | Vivaldi |
|---------|--------|---------|
| Tab Stacks mode | ✅ Works natively | ✅ Works (uses `chrome.tabGroups`) |
| Windows mode | ✅ Works | ✅ Works |
| Workspaces mode | ❌ Not available | ✅ Requires bridge |
| Bridge installation | Not needed | Only for Workspace mode |
| Browser auto‑detection | Detected as Chrome | Detected as Vivaldi |
| Blank tab URL | `chrome://newtab/` | `vivaldi://startpage/` or `vivaldi://newtab/` |

## Tab Chunking

When you have more than 100 tabs, the extension automatically splits them into batches of 80 and sends each batch to the AI separately. Results are merged before preview.

| Symptom | Explanation |
|---------|-------------|
| Multiple progress updates during analysis | Normal — each chunk triggers a separate AI request |
| Slightly different categorisation for similar tabs | Each chunk is processed independently; add logic rules for consistency |
| Slower analysis with many tabs | Expected — more chunks mean more API calls with rate limiting between them |

## AI Response Errors

| Message | Meaning |
|---------|---------|
| "Could not find JSON…" | AI returned text without a JSON array – retry |
| "Invalid JSON…" | Malformed response – try fewer tabs or simpler rules |
| "Empty list" | AI returned `[]` – rephrase categories |
| "Missing id or category" | AI output format wrong – retry |

## Performance

- **100+ tabs** are automatically chunked into batches of 80 for reliable AI processing.
- **200+ tabs** may take 30–60 s to analyse due to multiple chunk requests.
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
