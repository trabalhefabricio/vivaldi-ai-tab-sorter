# Quick Installation Guide

## Part 1 – Install the Extension (5 min)

1. **Download** – click the green **Code** button on GitHub → **Download ZIP** → extract.
2. **Load in Vivaldi** – go to `vivaldi://extensions` → toggle **Developer mode** ON → **Load unpacked** → select the extracted folder.
3. **Get API Key** – visit https://aistudio.google.com/app/apikey → sign in → **Create API key** → copy it.
4. **Configure** – click the extension icon → paste the key → enter categories → done!

> Tab Stacks and Windows modes work right away. Workspace mode auto‑detects Vivaldi's API. If detection fails, continue to Part 2.

---

## Part 2 – Enable Workspace Mode

### Automatic (recommended)

1. Select **🏆 Workspaces** in the extension popup.
2. If it shows "⚠️ Bridge not detected", click **⬇️ Download Install Script**.
3. **Close Vivaldi completely.**
4. Run the downloaded script:
   - **Windows**: Right‑click `install_bridge.ps1` → **Run with PowerShell**
   - **macOS / Linux**: `chmod +x install_bridge.sh && ./install_bridge.sh` (Linux may need `sudo`)
5. Restart Vivaldi.
6. Click **🔍 Check Connection** in the popup — you should see ✅.

### Manual (alternative)

⚠️ Back up `window.html` before editing.

#### Windows

1. Close Vivaldi completely.
2. Open `%LOCALAPPDATA%\Vivaldi\Application\<version>\resources\vivaldi`.
3. Back up `window.html`.
4. Open `window.html` in Notepad, find `</body>`, add **before** it:
   ```html
   <script src="ai_bridge.js"></script>
   ```
5. Copy `ai_bridge.js` from the extension folder into the same directory.
6. Restart Vivaldi.

#### macOS

1. Close Vivaldi.
2. Open `/Applications/Vivaldi.app/Contents/Versions/<version>/Vivaldi Framework.framework/Resources/vivaldi`.
3. Same steps 3–6 as Windows.

#### Linux

```bash
cd /opt/vivaldi/resources/vivaldi   # or /snap/vivaldi/…
sudo cp window.html window.html.backup
sudo nano window.html               # add script tag before </body>
sudo cp /path/to/ai_bridge.js .
```
Restart Vivaldi.

---

## Test It

1. Open 10–20 tabs with varied content.
2. Click the extension icon.
3. Enter categories, e.g. `Work, Shopping, News`.
4. Click **🔍 Analyze** → review → **✨ Apply**.

## Need Help?

- Extension not loading? Ensure Developer mode is ON.
- API errors? Verify key at https://aistudio.google.com/app/apikey.
- Workspaces not working? Check bridge script path and restart Vivaldi.
- After Vivaldi updates: repeat Part 2 for the new version folder.
