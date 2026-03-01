# 🚀 Vivaldi AI Tab Sorter – Documentation

An intelligent Vivaldi extension that uses Google Gemini AI to organise tabs into Tab Stacks or separate Windows. No bridge scripts or system modifications needed — works out of the box.

## ✨ Features

| Feature | Details |
|---------|---------|
| AI categorisation | Gemini analyses tab titles & URLs |
| Custom categories | Comma‑separated list you define |
| Logic rules | Natural‑language rules to steer the AI |
| Two modes | Tab Stacks · Windows |
| Duplicate removal | Optional toggle before sorting |
| Preview | See the plan before applying |
| Persistent settings | Saved via `chrome.storage.local` |
| Usage tracking | Daily request counter with reset |
| Model selection | Pick any compatible Gemini model |

## 📋 Requirements

- **Vivaldi Browser** (latest recommended)
- **Gemini API key** – [get one free](https://aistudio.google.com/app/apikey)

## 🔧 Installation

1. Open `vivaldi://extensions`.
2. Enable **Developer mode** (top‑right toggle).
3. Click **Load unpacked** → select this folder.

That's it — no bridge scripts or system file editing required.

## 🎯 Usage

1. Click the extension icon.
2. Paste your Gemini API key.
3. Enter categories (e.g. `Work, Shopping, Research, Social`).
4. Optionally add logic rules and toggle duplicate removal.
5. Choose a mode → **Analyze** → review preview → **Apply**.

## 🎨 Modes

| Mode | Description |
|------|-------------|
| Tab Stacks | Coloured, named groups in current window |
| Windows | One new window per category |

**Tab Stacks** uses the native `chrome.tabGroups` API — tabs are grouped, coloured, and labelled right in your tab bar.

**Windows** creates a separate browser window for each category.

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
| API error | Check key validity & quota at [AI Studio](https://aistudio.google.com/) |
| Tabs not moving | Unpin tabs; avoid incognito tabs |
| Extension icon blank | Replace placeholder PNGs in `icons/` |

More detail in [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## 📄 License

MIT – see [LICENSE](LICENSE).
