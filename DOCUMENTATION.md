# 🚀 Vivaldi AI Tab Sorter v3.0.0 – Documentation

An intelligent browser extension for **Vivaldi** and **Chrome** that uses AI (Gemini, OpenAI, or Claude) to organise tabs into Workspaces, Tab Stacks, or separate Windows.

## ✨ Features

| Feature | Details |
|---------|---------|
| Multi‑provider AI | Gemini, OpenAI (GPT), and Claude analyse tab titles & URLs |
| Custom categories | Comma‑separated list you define |
| Logic rules | Natural‑language rules to steer the AI |
| Three modes | Workspaces · Tab Stacks · Windows |
| Tab chunking | Automatically splits large tab counts (100+) into batches for reliable AI processing |
| Uncategorized toggle | Choose whether to create a group for uncategorized tabs |
| Reassign toggle | Control whether tabs already in a workspace get reassigned |
| Auto‑close toggle | Choose whether the popup closes after applying |
| Workspace scope | Process all windows or current window only |
| Duplicate removal | Optional toggle before sorting |
| Preview | See the plan before applying |
| Persistent settings | Saved via `chrome.storage.local` |
| Usage tracking | Daily request counter with reset |
| Model selection | Pick any compatible model per provider (Gemini, OpenAI, Claude) |
| Browser detection | Auto‑detects Chrome vs Vivaldi and adjusts available modes |

## 📋 Requirements

- **Vivaldi Browser** or **Google Chrome** (latest recommended)
- At least one AI API key:
  - **Gemini** – [get one free](https://aistudio.google.com/app/apikey)
  - **OpenAI** – [get one](https://platform.openai.com/api-keys)
  - **Claude** – [get one](https://console.anthropic.com/)

## 🔧 Installation

### Step 1 – Load the extension

1. Open `vivaldi://extensions` (Vivaldi) or `chrome://extensions` (Chrome).
2. Enable **Developer mode** (top‑right toggle).
3. Click **Load unpacked** → select this folder.

### Step 2 – Enable Workspace mode (Vivaldi only)

> **Chrome users**: Tab Stacks and Windows modes work out of the box. Workspace mode is Vivaldi‑only.

The extension **auto‑detects** whether Vivaldi exposes its workspace API directly. If it does, workspaces work immediately — no bridge needed.

If auto‑detection reports "Bridge not detected", use the **one‑click installer**:

1. Select **🏆 Workspaces** mode in the popup.
2. Click **⬇️ Download Install Script**.
3. Run the downloaded script (PowerShell on Windows, bash on macOS/Linux).
4. Restart Vivaldi.
5. Click **🔍 Check Connection** — it should show ✅.

#### Manual bridge installation (alternative)

If you prefer to install manually:

#### Windows

```
%LOCALAPPDATA%\Vivaldi\Application\<version>\resources\vivaldi
```

1. Close Vivaldi.
2. Back up `window.html`.
3. Add before `</body>`: `<script src="ai_bridge.js"></script>`
4. Copy `ai_bridge.js` into the same folder.
5. Restart Vivaldi.

#### macOS

```
/Applications/Vivaldi.app/Contents/Versions/<version>/Vivaldi Framework.framework/Resources/vivaldi
```

Same steps as Windows.

#### Linux

```bash
cd /opt/vivaldi/resources/vivaldi
sudo cp window.html window.html.backup
sudo nano window.html   # add script tag before </body>
sudo cp /path/to/ai_bridge.js .
```

> After Vivaldi updates you may need to repeat this step.

## 🎯 Usage

1. Click the extension icon.
2. Select your AI provider (Gemini, OpenAI, or Claude) and paste the corresponding API key.
3. Enter categories (e.g. `Work, Shopping, Research, Social`).
4. Optionally add logic rules, configure toggles (uncategorized, reassign, auto‑close), and toggle duplicate removal.
5. Choose a mode → **Analyze** → review preview → **Apply**.

> For large tab counts (100+), the extension automatically chunks tabs into batches and merges the AI results.

## 🎨 Modes

| Mode | Description | Bridge needed? | Chrome? |
|------|-------------|:--------------:|:-------:|
| Workspaces | Creates/reuses native Vivaldi Workspaces | Auto‑detected; bridge if needed | ❌ Vivaldi only |
| Tab Stacks | Tab groups via `chrome.tabGroups` API | ❌ | ✅ |
| Windows | One new window per category | ❌ | ✅ |

### A note on Vivaldi Tab Stacks vs chrome.tabGroups

Vivaldi has its own native **Tab Stacking** feature (compact, two‑level, accordion). The **Tab Stacks** mode in this extension uses Chrome's `chrome.tabGroups` API, which Vivaldi supports as a Chromium‑based browser. The result is labelled, coloured tab groups in your tab bar — visually similar but implemented via the standard extension API rather than Vivaldi's internal stacking engine.

If you want to organise tabs into **Vivaldi's native Workspaces** (the workspace switcher in the tab bar), use the **Workspaces** mode with the bridge installed.

## 💡 Tips

- Start with 3–5 categories for best results.
- Use descriptive names that match your workflow.
- Add logic rules for frequently visited domains.
- Always preview before applying.

## 🔒 Privacy & Security

- API keys stored locally only.
- Tab data is sent to your chosen AI provider (Gemini, OpenAI, or Claude) for categorisation.
- No external data storage by this extension.
- Minimal permissions requested.

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| Bridge not responding | Verify `ai_bridge.js` path and restart Vivaldi |
| API error | Check key validity & quota at your provider's dashboard |
| Tabs not moving | Unpin tabs; avoid incognito tabs |
| Extension icon blank | Replace placeholder PNGs in `icons/` |

More detail in [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## 🔄 After Vivaldi Updates

Re‑run the install script or re‑add the `<script>` tag and copy `ai_bridge.js` to the new version folder. Click **🔍 Check Connection** in the popup to verify.

## 📄 License

MIT – see [LICENSE](LICENSE).
