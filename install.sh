#!/usr/bin/env bash
# install.sh – Vivaldi AI Tab Sorter setup (macOS / Linux)
# Copies extension to a permanent folder, installs the Vivaldi bridge if found,
# then opens the extensions page so you only need to click "Load unpacked".
#
# Usage: chmod +x install.sh && ./install.sh
# Linux bridge may need: sudo ./install.sh

set -euo pipefail

EXT_NAME="vivaldi-ai-tab-sorter"

if [[ "$OSTYPE" == darwin* ]]; then
    INSTALL_DIR="$HOME/Library/Application Support/$EXT_NAME"
else
    INSTALL_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/$EXT_NAME"
fi

echo ""
echo "=== Vivaldi AI Tab Sorter – Setup ==="
echo ""

# ── 1. Verify source files ──────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

for f in manifest.json popup.html popup.js background.js; do
    if [ ! -f "$SCRIPT_DIR/$f" ]; then
        echo "ERROR: $f not found next to this script."
        echo "Make sure you extracted the full ZIP before running."
        exit 1
    fi
done

# ── 2. Copy extension to permanent location ─────────────────────────────────

if [ -d "$INSTALL_DIR" ]; then
    echo "[ext] Updating existing installation at: $INSTALL_DIR"
else
    echo "[ext] Installing to: $INSTALL_DIR"
fi
mkdir -p "$INSTALL_DIR/icons"

for f in manifest.json popup.html popup.js background.js ai_bridge.js LICENSE README.md; do
    if [ -f "$SCRIPT_DIR/$f" ]; then
        cp "$SCRIPT_DIR/$f" "$INSTALL_DIR/"
        echo "  Copied $f"
    fi
done
for f in icon16.png icon48.png icon128.png; do
    if [ -f "$SCRIPT_DIR/icons/$f" ]; then
        cp "$SCRIPT_DIR/icons/$f" "$INSTALL_DIR/icons/"
        echo "  Copied icons/$f"
    fi
done

echo ""
echo "[ext] Extension files ready at: $INSTALL_DIR"

# ── 3. Install Vivaldi bridge (if Vivaldi is found) ─────────────────────────

BRIDGE_SRC="$SCRIPT_DIR/ai_bridge.js"
VIVALDI_TARGET=""

if [ -f "$BRIDGE_SRC" ]; then
    if [[ "$OSTYPE" == darwin* ]]; then
        VBASE="/Applications/Vivaldi.app/Contents/Versions"
        if [ -d "$VBASE" ]; then
            VVER=$(ls -1 "$VBASE" 2>/dev/null | sort -V | tail -n1)
            if [ -n "$VVER" ]; then
                CANDIDATE="$VBASE/$VVER/Vivaldi Framework.framework/Resources/vivaldi"
                [ -f "$CANDIDATE/window.html" ] && VIVALDI_TARGET="$CANDIDATE"
            fi
        fi
    else
        for BASE in \
          /opt/vivaldi/resources/vivaldi \
          /usr/lib/vivaldi/resources/vivaldi \
          /snap/vivaldi/current/opt/vivaldi/resources/vivaldi \
          /var/lib/flatpak/app/com.vivaldi.Vivaldi/current/active/files/opt/vivaldi/resources/vivaldi; do
            if [ -f "$BASE/window.html" ]; then
                VIVALDI_TARGET="$BASE"
                break
            fi
        done
    fi
fi

if [ -n "$VIVALDI_TARGET" ]; then
    echo ""
    echo "[bridge] Vivaldi detected – installing workspace bridge..."
    echo "[bridge] Target: $VIVALDI_TARGET"

    # Warn if running
    if pgrep -x "Vivaldi" >/dev/null 2>&1 || pgrep -x "vivaldi" >/dev/null 2>&1 || pgrep -x "vivaldi-bin" >/dev/null 2>&1; then
        echo "[bridge] WARNING: Vivaldi is running. Bridge changes take effect after restart."
    fi

    # Backup
    if [ ! -f "$VIVALDI_TARGET/window.html.backup" ]; then
        cp "$VIVALDI_TARGET/window.html" "$VIVALDI_TARGET/window.html.backup"
        echo "  Backed up window.html"
    else
        echo "  Backup already exists – skipping"
    fi

    # Copy ai_bridge.js
    cp "$BRIDGE_SRC" "$VIVALDI_TARGET/ai_bridge.js"
    echo "  Copied ai_bridge.js"

    # Patch window.html
    if grep -q 'ai_bridge\.js' "$VIVALDI_TARGET/window.html"; then
        echo "  Script tag already present – skipping"
    else
        if [[ "$OSTYPE" == darwin* ]]; then
            sed -i '' 's|</body>|  <script src="ai_bridge.js"></script>\
</body>|' "$VIVALDI_TARGET/window.html"
        else
            sed -i 's|</body>|  <script src="ai_bridge.js"></script>\n</body>|' "$VIVALDI_TARGET/window.html"
        fi
        echo "  Patched window.html"
    fi

    # Verify
    if [ -f "$VIVALDI_TARGET/ai_bridge.js" ] && grep -q 'ai_bridge\.js' "$VIVALDI_TARGET/window.html"; then
        echo "[bridge] Bridge installed successfully."
    else
        echo "[bridge] Bridge verification failed – check files manually."
    fi
else
    echo ""
    echo "[bridge] Vivaldi not found – skipping bridge (not needed for Chrome)."
fi

# ── 4. Open extensions page & copy path ──────────────────────────────────────

echo ""

# Copy to clipboard
if [[ "$OSTYPE" == darwin* ]]; then
    printf '%s' "$INSTALL_DIR" | pbcopy 2>/dev/null && echo "Path copied to clipboard."
elif command -v xclip >/dev/null 2>&1; then
    printf '%s' "$INSTALL_DIR" | xclip -selection clipboard 2>/dev/null && echo "Path copied to clipboard."
elif command -v xsel >/dev/null 2>&1; then
    printf '%s' "$INSTALL_DIR" | xsel --clipboard 2>/dev/null && echo "Path copied to clipboard."
fi

# Open browser
opened=false
if [[ "$OSTYPE" == darwin* ]]; then
    if [ -d "/Applications/Vivaldi.app" ]; then
        open -a Vivaldi "vivaldi://extensions" 2>/dev/null && opened=true
    fi
    if [ "$opened" = false ] && [ -d "/Applications/Google Chrome.app" ]; then
        open -a "Google Chrome" "chrome://extensions" 2>/dev/null && opened=true
    fi
else
    for cmd in vivaldi vivaldi-stable google-chrome chromium-browser; do
        if command -v "$cmd" >/dev/null 2>&1; then
            if [ "$cmd" = vivaldi ] || [ "$cmd" = vivaldi-stable ]; then
                "$cmd" "vivaldi://extensions" >/dev/null 2>&1 &
            else
                "$cmd" "chrome://extensions" >/dev/null 2>&1 &
            fi
            opened=true
            break
        fi
    done
fi
if [ "$opened" = false ]; then
    echo "Could not open browser automatically."
    echo "Open vivaldi://extensions or chrome://extensions manually."
fi

echo ""
echo "=== FINAL STEP ==="
echo ""
echo "  1. Enable 'Developer mode' (top-right toggle)"
echo "  2. Click 'Load unpacked'"
echo "  3. Paste this path (already on your clipboard):"
echo "     $INSTALL_DIR"
echo ""
echo "Done! Restart Vivaldi if you want workspace support."
echo ""
