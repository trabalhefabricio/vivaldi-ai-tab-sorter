# Quick Installation Guide

## For Non-Coders: Step-by-Step Setup

### Part 1: Install the Extension (5 minutes)

1. **Download the Extension**
   - Click the green "Code" button on GitHub
   - Select "Download ZIP"
   - Extract the ZIP file to a location you'll remember (e.g., Documents folder)

2. **Install in Vivaldi**
   - Open Vivaldi browser
   - Type `vivaldi://extensions` in the address bar and press Enter
   - Toggle ON "Developer mode" (switch in the top-right corner)
   - Click "Load unpacked" button
   - Navigate to the extracted folder and select it
   - The extension icon should appear in your toolbar

3. **Get Your Gemini API Key**
   - Visit: https://aistudio.google.com/app/apikey
   - Sign in with your Google account
   - Click "Create API key"
   - Copy the key (it starts with "AIza...")
   - Keep this key safe!

4. **Configure the Extension**
   - Click the extension icon in your toolbar
   - Paste your API key in the first field
   - Enter categories (e.g., "Work, Shopping, Research, Social, Entertainment")
   - That's it! You can now use Tab Stacks and Windows modes

### Part 2: Enable Workspace Mode (Optional, 10 minutes)

⚠️ **Important**: This step modifies a Vivaldi system file. Back up first!

**Windows Users:**

1. **Close Vivaldi completely** (check Task Manager to be sure)

2. **Open File Explorer and navigate to:**
   ```
   C:\Users\[YOUR-USERNAME]\AppData\Local\Vivaldi\Application
   ```
   Replace `[YOUR-USERNAME]` with your Windows username

3. **Find the version folder** (looks like "6.5.3206.50" or similar)
   - Open it
   - Open "resources" folder
   - Open "vivaldi" folder

4. **Back up window.html**
   - Right-click on `window.html`
   - Click "Copy"
   - Right-click in the same folder → "Paste"
   - Rename the copy to `window.html.backup`

5. **Edit window.html**
   - Right-click on `window.html`
   - Select "Open with" → "Notepad"
   - Press Ctrl+F to search
   - Search for `</body>`
   - Add this line RIGHT BEFORE `</body>`:
     ```html
     <script src="ai_bridge.js"></script>
     ```
   - Save the file (Ctrl+S)

6. **Copy the bridge script**
   - Go back to the extension folder you extracted earlier
   - Find the file `ai_bridge.js`
   - Copy it
   - Paste it in the same "vivaldi" folder where window.html is

7. **Restart Vivaldi**

**macOS Users:**

1. **Close Vivaldi completely**

2. **Open Finder and press Cmd+Shift+G**, then paste:
   ```
   /Applications/Vivaldi.app/Contents/Versions/
   ```

3. **Find the version folder** and navigate to:
   ```
   [version]/Vivaldi Framework.framework/Resources/vivaldi
   ```

4. **Back up window.html** (make a copy named window.html.backup)

5. **Edit window.html** with TextEdit or your preferred editor:
   - Find `</body>` (near the end)
   - Add this line before it:
     ```html
     <script src="ai_bridge.js"></script>
     ```
   - Save

6. **Copy `ai_bridge.js`** from the extension folder to this vivaldi folder

7. **Restart Vivaldi**

**Linux Users:**

1. **Close Vivaldi completely**

2. **Open Terminal and run:**
   ```bash
   cd /opt/vivaldi/resources/vivaldi
   # Or for Snap: cd /snap/vivaldi/current/opt/vivaldi/resources/vivaldi
   ```

3. **Back up window.html:**
   ```bash
   sudo cp window.html window.html.backup
   ```

4. **Edit window.html:**
   ```bash
   sudo nano window.html
   ```
   - Scroll to the bottom
   - Find `</body>`
   - Add this line before it:
     ```html
     <script src="ai_bridge.js"></script>
     ```
   - Press Ctrl+X, then Y, then Enter to save

5. **Copy the bridge script:**
   ```bash
   sudo cp /path/to/extension/ai_bridge.js .
   ```
   (Replace `/path/to/extension/` with the actual path)

6. **Restart Vivaldi**

## Testing It Works

1. Open 10-20 tabs with different types of content
2. Click the extension icon
3. Enter your categories (e.g., "Work, Shopping, News")
4. Click "🔍 Analyze & Preview"
5. If you installed the bridge, select "Workspaces" mode
6. Click "✨ Apply Sorting"
7. Check your Vivaldi sidebar for the new Workspaces!

## Need Help?

- **Extension not loading?** Make sure Developer mode is ON
- **API errors?** Check your API key at https://aistudio.google.com/app/apikey
- **Workspaces not working?** Verify ai_bridge.js is in the correct location
- **After Vivaldi updates:** You may need to repeat Part 2 for the new version

## What Each Mode Does

- **Workspaces** 🏆: Creates dedicated Vivaldi Workspaces (requires bridge script)
- **Tab Stacks** 📚: Groups tabs visually in current window (no bridge needed)
- **Separate Windows** 🪟: Creates new windows for each category (no bridge needed)

Start with Tab Stacks or Windows if you want to try it without installing the bridge!
