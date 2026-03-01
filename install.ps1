# install.ps1 – Vivaldi AI Tab Sorter setup (Windows)
# Copies extension to a permanent folder, installs the Vivaldi bridge if found,
# then opens the extensions page so you only need to click "Load unpacked".
#
# Run: Right-click -> "Run with PowerShell"
#   or: powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"

$ExtName = "vivaldi-ai-tab-sorter"
$InstallDir = "$env:LOCALAPPDATA\$ExtName"

Write-Host ""
Write-Host "=== Vivaldi AI Tab Sorter – Setup ===" -ForegroundColor Cyan
Write-Host ""

# ── 1. Verify source files ──────────────────────────────────────────────────

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$RequiredFiles = @("manifest.json", "popup.html", "popup.js", "background.js")
foreach ($f in $RequiredFiles) {
    if (-Not (Test-Path (Join-Path $ScriptDir $f))) {
        Write-Host "ERROR: $f not found next to this script." -ForegroundColor Red
        Write-Host "Make sure you extracted the full ZIP before running." -ForegroundColor Yellow
        exit 1
    }
}

# ── 2. Copy extension to permanent location ─────────────────────────────────

if (Test-Path $InstallDir) {
    Write-Host "[ext] Updating existing installation at: $InstallDir" -ForegroundColor Yellow
} else {
    Write-Host "[ext] Installing to: $InstallDir" -ForegroundColor Green
}
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path "$InstallDir\icons" | Out-Null

$FilesToCopy = @("manifest.json", "popup.html", "popup.js", "background.js", "ai_bridge.js", "LICENSE", "README.md")
foreach ($f in $FilesToCopy) {
    $src = Join-Path $ScriptDir $f
    if (Test-Path $src) {
        Copy-Item $src -Destination $InstallDir -Force
        Write-Host "  Copied $f" -ForegroundColor Gray
    }
}
foreach ($f in @("icon16.png", "icon48.png", "icon128.png")) {
    $src = Join-Path $ScriptDir "icons\$f"
    if (Test-Path $src) {
        Copy-Item $src -Destination "$InstallDir\icons" -Force
        Write-Host "  Copied icons\$f" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "[ext] Extension files ready at: $InstallDir" -ForegroundColor Green

# ── 3. Install Vivaldi bridge (if Vivaldi is found) ─────────────────────────

$bridgeSrc = Join-Path $ScriptDir "ai_bridge.js"
$vivaldiBase = "$env:LOCALAPPDATA\Vivaldi\Application"

if ((Test-Path $vivaldiBase) -And (Test-Path $bridgeSrc)) {
    Write-Host ""
    Write-Host "[bridge] Vivaldi detected – installing workspace bridge..." -ForegroundColor Cyan

    # Check if Vivaldi is running
    if (Get-Process vivaldi -ErrorAction SilentlyContinue) {
        Write-Host "[bridge] WARNING: Vivaldi is running. Bridge changes take effect after restart." -ForegroundColor Yellow
    }

    # Find latest version directory
    $verDirs = Get-ChildItem $vivaldiBase -Directory | Where-Object { $_.Name -match '^\d[\d.]+$' } | Sort-Object { [version]$_.Name } -Descending
    if ($verDirs) {
        $target = Join-Path $verDirs[0].FullName "resources\vivaldi"

        if (Test-Path "$target\window.html") {
            Write-Host "[bridge] Target: $target" -ForegroundColor Gray

            # Backup window.html
            $backup = "$target\window.html.backup"
            if (-Not (Test-Path $backup)) {
                Copy-Item "$target\window.html" $backup
                Write-Host "  Backed up window.html" -ForegroundColor Green
            } else {
                Write-Host "  Backup already exists – skipping" -ForegroundColor Gray
            }

            # Copy ai_bridge.js
            Copy-Item $bridgeSrc -Destination "$target\ai_bridge.js" -Force
            Write-Host "  Copied ai_bridge.js" -ForegroundColor Green

            # Patch window.html
            $html = Get-Content "$target\window.html" -Raw
            if ($html -match 'ai_bridge\.js') {
                Write-Host "  Script tag already present – skipping" -ForegroundColor Gray
            } else {
                $scriptLine = '  <script src="ai_bridge.js"></script>'
                $html = $html -replace '</body>', ($scriptLine + [char]10 + '</body>')
                Set-Content -Path "$target\window.html" -Value $html -Encoding UTF8
                Write-Host "  Patched window.html" -ForegroundColor Green
            }

            # Verify
            $ok = (Test-Path "$target\ai_bridge.js") -and ((Get-Content "$target\window.html" -Raw) -match 'ai_bridge\.js')
            if ($ok) {
                Write-Host "[bridge] Bridge installed successfully." -ForegroundColor Green
            } else {
                Write-Host "[bridge] Bridge verification failed – check files manually." -ForegroundColor Red
            }
        } else {
            Write-Host "[bridge] window.html not found in $target – skipping bridge." -ForegroundColor Yellow
        }
    } else {
        Write-Host "[bridge] No Vivaldi version folders found – skipping bridge." -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "[bridge] Vivaldi not found – skipping bridge (not needed for Chrome)." -ForegroundColor Gray
}

# ── 4. Open extensions page & copy path ──────────────────────────────────────

Write-Host ""

$InstallDir | Set-Clipboard

$opened = $false
$vivaldiExe = "$env:LOCALAPPDATA\Vivaldi\Application\vivaldi.exe"
if (Test-Path $vivaldiExe) {
    Start-Process $vivaldiExe "vivaldi://extensions"
    $opened = $true
}
if (-Not $opened) {
    try { Start-Process "chrome" "chrome://extensions"; $opened = $true } catch { }
}
if (-Not $opened) {
    Write-Host "Could not open browser automatically." -ForegroundColor Yellow
    Write-Host "Open vivaldi://extensions or chrome://extensions manually." -ForegroundColor Yellow
}

Write-Host "=== FINAL STEP ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Enable 'Developer mode' (top-right toggle)" -ForegroundColor White
Write-Host "  2. Click 'Load unpacked'" -ForegroundColor White
Write-Host "  3. Paste this path (already on your clipboard):" -ForegroundColor White
Write-Host "     $InstallDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "Done! Restart Vivaldi if you want workspace support." -ForegroundColor Green
Write-Host ""
