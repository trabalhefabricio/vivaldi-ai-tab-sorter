  <h1>Vivaldi AI Tab Sorter</h1>

  <p><strong>Intelligently organize hundreds of browser tabs into Workspaces, Tab Stacks, or Windows — powered by AI.</strong></p>

  <p>
    <a href="INSTALL.md"><img alt="Install Guide" src="https://img.shields.io/badge/install-guide-blue?style=flat-square" /></a>
    <a href="DOCUMENTATION.md"><img alt="Docs" src="https://img.shields.io/badge/docs-DOCUMENTATION.md-green?style=flat-square" /></a>
    <a href="CHANGELOG.md"><img alt="Changelog" src="https://img.shields.io/badge/changelog-CHANGELOG.md-orange?style=flat-square" /></a>
    <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" /></a>
  </p>

</div>

---

## ✨ Feature Highlights

- 🤖 **Multi-Provider AI** — choose Google Gemini *(free tier)*, OpenAI, or Anthropic Claude
- 🏆 **Vivaldi Workspaces** — auto-detected, or one-click bridge setup
- 📚 **Tab Stacks / Groups** — colored, named groups in the current window
- 🪟 **Separate Windows** — one window per category
- ⚡ **Smart Chunking** — handles 100+ tabs by splitting requests automatically
- 🔍 **Browser Detection** — adapts to Vivaldi or Chrome at runtime
- 👀 **Preview Before Applying** — review the AI's plan, then commit
- 🔄 **Duplicate Removal** — optional dedup before sorting
- 🎯 **Custom Rules** — steer the AI with your own category logic
- 💾 **Persistent Settings** — API keys, categories, and preferences saved automatically
- 📊 **Usage Tracking** — monitor your daily API quota at a glance

## 📦 Download

Every commit automatically builds an installable `.zip` via GitHub Actions.

1. Go to the [**Actions** tab](../../actions) → click the latest **Build Extension** run → download the **artifact**.
2. Unzip anywhere on your machine.

Or clone the repo directly if you prefer loading from source.

## 🚀 Quick Start

```text
1. Open vivaldi://extensions → enable Developer mode → Load unpacked → select the unzipped folder.
2. Get a free API key from https://aistudio.google.com/app/apikey (or use OpenAI / Claude).
3. Click the extension icon → paste your key → enter your categories.
4. Hit Analyze → review the preview → Apply.
```

> **Workspaces** auto-detect Vivaldi's private API. If detection fails, click **⬇️ Download Install Script** in the popup for a one-click bridge setup — see [INSTALL.md](INSTALL.md) for details.

## 🤖 AI Provider Support

| Provider | Models | Free Tier | API Key |
|----------|--------|-----------|---------|
| **Google Gemini** | Gemini 2.0 Flash, 1.5 Pro, etc. | ✅ 1 500 req/day | [Get key](https://aistudio.google.com/app/apikey) |
| **OpenAI** | GPT-4o-mini, GPT-4o, GPT-4.1-mini, GPT-4.1-nano | ❌ | [Get key](https://platform.openai.com/api-keys) |
| **Anthropic Claude** | Claude Sonnet 4, 3.5 Sonnet, 3.5 Haiku | ❌ | [Get key](https://console.anthropic.com/) |

Select your provider and model directly in the popup — no config files needed.

## 📂 Organization Modes

| Mode | What It Does | Browser Support |
|------|-------------|-----------------|
| **Workspaces** | Creates or reuses a Vivaldi Workspace per category. Optionally reassigns existing tabs. | Vivaldi only (requires bridge for full support) |
| **Tab Stacks / Groups** | Groups tabs into colored, named stacks in the current window. | Vivaldi + Chrome (`chrome.tabGroups`) |
| **Windows** | Moves each category into its own browser window. | Vivaldi + Chrome |

## 🌐 Browser Compatibility

| Feature | Vivaldi | Chrome / Chromium |
|---------|---------|-------------------|
| Tab Stacks / Groups | ✅ Native | ✅ `chrome.tabGroups` |
| Separate Windows | ✅ | ✅ |
| Workspaces | ✅ Auto-detect + bridge | ❌ Not available |
| Private API bridge | ✅ `vivaldi.tabsPrivate` | ❌ N/A |

The extension auto-detects which browser is running and enables or disables features accordingly.

## ⚙️ Configuration

- **Categories** — comma-separated list (e.g. `Work, Shopping, Social Media, Dev Tools`).
- **Custom Rules** — free-text instructions appended to the AI prompt (e.g. *"Always put GitHub tabs in Dev Tools"*).
- **Scope** — choose *current window* or *all windows* for Tab Stacks mode.
- **Toggles** — duplicate removal, uncategorized tab handling, reassign existing workspace tabs.

See [EXAMPLES.md](EXAMPLES.md) for real-world category setups and rule examples.

## 🔒 Privacy & Security

- **Local storage only** — API keys and settings are stored in `chrome.storage.local`; nothing leaves your machine except AI requests.
- **Minimal data sent** — only tab titles and URLs are sent to your chosen AI provider for categorisation.
- **No telemetry** — no analytics, tracking pixels, or external data collection.
- **XSS-hardened** — all dynamic DOM content uses `textContent`; HTML strings are sanitised before display.
- **Open source** — audit every line of code in this repository.

## 🧪 Development

```bash
# Run the validation suite
bash validate.sh

# Run unit tests (Node.js)
node test/parser.test.js
```

See [TEST_RESULTS.md](TEST_RESULTS.md) for the latest test output and [TROUBLESHOOTING.md](TROUBLESHOOTING.md) if something goes wrong.

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/my-change`).
3. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/).
4. Open a Pull Request describing what you changed and why.

Bug reports and feature requests are welcome — please open an [issue](../../issues).

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a full version history.

## 📄 License

This project is released under the **MIT License** — see [LICENSE](LICENSE) for the full text.

> **Note:** The bridge script (`ai_bridge.js`) interacts with Vivaldi's *private* APIs (`vivaldi.tabsPrivate`, `vivaldi.workspaces`). These APIs are undocumented and may change between Vivaldi releases. Use at your own risk.

---

<div align="center">
  <sub>Built with Google Gemini, OpenAI & Anthropic Claude — for the Vivaldi community ❤️</sub>
</div>
