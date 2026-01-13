<div align="center">

<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

  <h1>🚀 Vivaldi AI Tab Sorter</h1>

  <p>Power-User AI Tab Manager for Vivaldi Browser</p>
  
  <p>Intelligently organize hundreds of tabs into Workspaces, Tab Stacks, or Windows using Google Gemini AI</p>

  <a href="https://aistudio.google.com/app/apikey">Get Gemini API Key</a> | <a href="DOCUMENTATION.md">Full Documentation</a>

</div>

---

> **⚠️ Important**: This extension is specifically designed for **Vivaldi Browser** and uses Vivaldi's proprietary tab stacking and workspace APIs. It will **NOT work** in Chrome or other browsers.

## ✨ Features

- 🤖 **AI-Powered**: Uses Gemini 2.0 Flash to analyze and categorize tabs
- 🏆 **Vivaldi Workspaces**: Automatically create and organize tabs into Workspaces
- 📚 **Tab Stacks**: Group tabs visually using Vivaldi's native tab stacking
- 🪟 **Separate Windows**: Create dedicated windows for each category
- 🎯 **Custom Rules**: Guide AI with your own logic rules
- 🔄 **Duplicate Removal**: Optional deduplication before sorting
- 👀 **Preview First**: See the plan before applying changes
- 💾 **Persistent Settings**: All settings saved automatically

## 🚀 Quick Start

1. **Install Extension**: Load unpacked in `vivaldi://extensions`
2. **Install Bridge Script**: Required for Tab Stacks, Windows, and Workspaces modes (see [DOCUMENTATION.md](DOCUMENTATION.md))
3. **Get API Key**: [Get your free Gemini API key](https://aistudio.google.com/app/apikey)
4. **Configure**: Enter API key and categories
5. **Analyze**: Click "Analyze & Preview"
6. **Apply**: Click "Apply Sorting" to organize!

**Important**: The bridge script installation is required because Vivaldi-specific APIs (`vivaldi.tabsPrivate`, `vivaldi.workspaces`) are only accessible from Vivaldi's internal page context, not from extension popups.

## 📖 Full Documentation

See [DOCUMENTATION.md](DOCUMENTATION.md) for:
- Detailed installation instructions
- Bridge script setup for Workspace mode
- Usage guide and tips
- Troubleshooting
- Configuration examples

## 🎯 Perfect For

- Managing 200+ tabs across multiple windows
- Organizing research sessions
- Separating work and personal browsing
- Project-based tab management
- Anyone who loves Vivaldi's power features

## 🔒 Privacy

- API key stored locally only
- Tab data sent to Gemini for categorization only
- No external data storage
- Open source - review the code yourself

## 🙏 Built With

- Google Gemini AI
- Vivaldi Browser APIs
- Love for productivity tools

---

<div align="center">
  <p>Built with AI Studio - <a href="https://aistudio.google.com/apps">Start building</a></p>
</div>
