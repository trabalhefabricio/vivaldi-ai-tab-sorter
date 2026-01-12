# 🚀 Vivaldi AI Tab Sorter

An intelligent browser extension specifically designed for Vivaldi that uses Google's Gemini AI to automatically organize your tabs into Workspaces, Tab Stacks, or separate Windows.

## ✨ Features

- **AI-Powered Categorization**: Uses Gemini 2.0 Flash to intelligently analyze and categorize tabs based on title and URL
- **Custom Categories**: Define your own categories (Work, Shopping, Research, Social, etc.)
- **Logic Rules**: Add custom rules to guide the AI's decision-making
- **Three Organization Modes**:
  - 🏆 **Vivaldi Workspaces** (Recommended): Automatically creates/uses Workspaces
  - 📚 **Tab Stacks**: Groups tabs in your current window
  - 🪟 **Separate Windows**: Creates one window per category
- **Duplicate Removal**: Optional toggle to remove duplicate tabs before sorting
- **Preview Before Apply**: See how tabs will be organized before making changes
- **Persistent Settings**: All settings are saved automatically

## 📋 Requirements

- Vivaldi Browser (latest version recommended)
- Google Gemini API Key ([Get one here](https://aistudio.google.com/app/apikey))
- For Workspace mode: Vivaldi bridge script installation (see below)

## 🔧 Installation

### Step 1: Install the Extension

1. Download or clone this repository
2. Open Vivaldi and navigate to `vivaldi://extensions`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the extension folder

### Step 2: Install the Vivaldi Bridge Script (For Workspace Mode)

The bridge script is required to enable the Workspace organization feature. Without it, you can still use Tab Stacks and Separate Windows modes.

#### Windows

1. **Close Vivaldi completely**
2. Navigate to Vivaldi's installation directory:
   ```
   C:\Users\[YourUsername]\AppData\Local\Vivaldi\Application\[version]\resources\vivaldi
   ```
3. **Backup window.html** (make a copy as window.html.backup)
4. Open `window.html` in a text editor (Notepad, VS Code, etc.)
5. Find the closing `</body>` tag (usually near the end of the file)
6. Add this line **before** the `</body>` tag:
   ```html
   <script src="ai_bridge.js"></script>
   ```
7. Copy `ai_bridge.js` from this extension folder to the same directory
8. Restart Vivaldi

#### macOS

1. **Close Vivaldi completely**
2. Navigate to:
   ```
   /Applications/Vivaldi.app/Contents/Versions/[version]/Vivaldi Framework.framework/Resources/vivaldi
   ```
3. **Backup window.html** (make a copy as window.html.backup)
4. Open `window.html` in a text editor
5. Find the closing `</body>` tag
6. Add this line **before** the `</body>` tag:
   ```html
   <script src="ai_bridge.js"></script>
   ```
7. Copy `ai_bridge.js` to the same directory
8. Restart Vivaldi

#### Linux

1. **Close Vivaldi completely**
2. Navigate to:
   ```
   /opt/vivaldi/resources/vivaldi
   ```
   Or if installed as Snap:
   ```
   /snap/vivaldi/current/opt/vivaldi/resources/vivaldi
   ```
3. **Backup window.html** (you may need sudo):
   ```bash
   sudo cp window.html window.html.backup
   ```
4. Edit `window.html` with sudo:
   ```bash
   sudo nano window.html
   ```
5. Find the closing `</body>` tag
6. Add this line **before** the `</body>` tag:
   ```html
   <script src="ai_bridge.js"></script>
   ```
7. Copy `ai_bridge.js` to the same directory:
   ```bash
   sudo cp /path/to/extension/ai_bridge.js .
   ```
8. Restart Vivaldi

**Note**: After Vivaldi updates, you may need to repeat this process as the window.html file might be replaced.

## 🎯 How to Use

1. **Open the Extension**: Click the extension icon in your toolbar
2. **Enter API Key**: Paste your Gemini API key in the first field
3. **Set Categories**: Enter categories separated by commas (e.g., "Work, Shopping, Research, Social")
4. **Add Rules** (Optional): Provide custom logic rules like:
   - "Always put YouTube in Entertainment unless the title mentions 'Coding', then put it in Work"
   - "GitHub pages should always go to Work"
5. **Choose Options**:
   - Check "Remove duplicate tabs" if you want duplicates removed
   - Select your preferred organization mode
6. **Analyze**: Click "🔍 Analyze & Preview" to see how tabs will be organized
7. **Apply**: Review the preview, then click "✨ Apply Sorting" to organize your tabs

## 🎨 Organization Modes Explained

### Workspaces Mode (Recommended)
- Creates or uses existing Vivaldi Workspaces matching your category names
- Moves tabs to the appropriate Workspace
- Best for maintaining long-term organization
- Requires bridge script installation

### Tab Stacks Mode
- Creates tab groups/stacks within your current window
- Groups are labeled with category names
- No bridge script needed
- Good for quick visual organization

### Separate Windows Mode
- Creates a new window for each category
- Each window contains only tabs from that category
- No bridge script needed
- Useful for working on different projects simultaneously

## 💡 Tips & Best Practices

1. **Start with 3-5 categories** for best results
2. **Use descriptive category names** that match your workflow
3. **Add logic rules** for domains you frequently visit
4. **Test with preview first** before applying changes
5. **Keep your API key safe** - it's stored locally but be cautious

## 🔒 Privacy & Security

- Your API key is stored locally in your browser only
- Tab data is sent to Google's Gemini API for categorization
- No data is stored on external servers by this extension
- The extension only accesses tab titles and URLs

## 🛠️ Troubleshooting

### "Workspace mode requires the Vivaldi bridge script"
- The bridge script is not installed or not running
- Follow the bridge script installation instructions above
- Check browser console (F12) for any errors

### "Error calling Gemini API"
- Verify your API key is correct
- Check your internet connection
- Ensure you have API quota remaining at [Google AI Studio](https://aistudio.google.com/)

### Tabs not moving to workspaces
- Ensure Vivaldi is fully restarted after installing the bridge script
- Check that `ai_bridge.js` is in the correct directory
- Open Vivaldi DevTools (F12) and check Console for errors

### Extension icon not showing
- The placeholder icons are minimal - you can replace them with custom icons
- Place 16x16, 48x48, and 128x128 PNG files in the `icons/` folder

## 🔄 Updating After Vivaldi Updates

When Vivaldi updates, the window.html file might be replaced. You'll need to:
1. Re-add the script tag to the new window.html
2. Copy ai_bridge.js to the new version's directory

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Built with Google Gemini AI
- Designed specifically for Vivaldi Browser
- Created to help power users manage hundreds of tabs efficiently

## 📞 Support

If you encounter issues:
1. Check the Troubleshooting section above
2. Review browser console for error messages
3. Open an issue on GitHub with detailed information

---

**Made with ❤️ for Vivaldi power users**
