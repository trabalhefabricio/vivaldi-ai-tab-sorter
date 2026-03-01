# 🚀 Vivaldi AI Tab Sorter – Documentation

An intelligent Vivaldi extension that uses Google Gemini AI to organise tabs into Workspaces, Tab Stacks, or separate Windows.

## ✨ Features

| Feature | Details |
|---------|---------|
| AI categorisation | Gemini analyses tab titles & URLs |
| Custom categories | Comma‑separated list you define |
| Logic rules | Natural‑language rules to steer the AI |
| Three modes | Workspaces · Tab Stacks · Windows |
| Duplicate removal | Optional toggle before sorting |
| Preview | See the plan before applying |
| Persistent settings | Saved via `chrome.storage.local` |
| Usage tracking | Daily request counter with reset |
| Model selection | Pick any compatible Gemini model |

## 📋 Requirements

- **Vivaldi Browser** (latest recommended)
- **Gemini API key** – [get one free](https://aistudio.google.com/app/apikey)
- For Workspace mode: bridge script installation (see below)

## 🔧 Installation

### Step 1 – Load the extension

1. Open `vivaldi://extensions`.
2. Enable **Developer mode** (top‑right toggle).
3. Click **Load unpacked** → select this folder.

### Step 2 – Install the bridge script (Workspace mode only)

The bridge gives the extension access to `vivaldi.workspaces`. Tab Stacks and Windows modes work without it.

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
2. Paste your Gemini API key.
3. Enter categories (e.g. `Work, Shopping, Research, Social`).
4. Optionally add logic rules and toggle duplicate removal.
5. Choose a mode → **Analyze** → review preview → **Apply**.

## 🎨 Modes

| Mode | Description | Bridge needed? |
|------|-------------|:--------------:|
| Workspaces | Creates/reuses Vivaldi Workspaces | ✅ |
| Tab Stacks | Coloured groups in current window | ❌ |
| Windows | One new window per category | ❌ |

## 💡 Tips

- Start with 3–5 categories for best results.
- Use descriptive names that match your workflow.
- Add logic rules for frequently visited domains.
- Always preview before applying.

## 🔒 Privacy & Security

- API key stored locally only.
- Tab data is sent to Google Gemini for categorisation.
- No external data storage by this extension.
- Minimal permissions requested.

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| Bridge not responding | Verify `ai_bridge.js` path and restart Vivaldi |
| API error | Check key validity & quota at [AI Studio](https://aistudio.google.com/) |
| Tabs not moving | Unpin tabs; avoid incognito tabs |
| Extension icon blank | Replace placeholder PNGs in `icons/` |

More detail in [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## 🔄 After Vivaldi Updates

Re‑add the `<script>` tag and copy `ai_bridge.js` to the new version folder.

## 📄 License

MIT – see [LICENSE](LICENSE).
