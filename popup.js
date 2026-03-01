'use strict';

// ── Constants ────────────────────────────────────────────────────────────────

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GROUP_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan'];
const RPM_INTERVAL_MS = 4000; // 15 RPM → one request every 4 s
const DAILY_LIMIT = 1400;     // stay under Google's 1 500/day free‑tier cap

// ── Helpers ──────────────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function sanitizeHtmlTags(str) {
  let prev;
  do { prev = str; str = str.replace(/<[^>]*>/g, ''); } while (str !== prev);
  return str;
}

function sanitizeErrorMessage(msg) {
  if (!msg) return 'An unknown error occurred';
  let s = msg.replace(/AI[a-zA-Z0-9_-]{28,}/g, '[REDACTED]');
  s = s.replace(/https?:\/\/[^\s]+\?[^\s]+/g, '[URL]');
  return s.length > 250 ? s.slice(0, 250) + '…' : s;
}

// ── TabSorter ────────────────────────────────────────────────────────────────

class TabSorter {
  constructor() {
    this.apiKey        = '';
    this.categories    = [];
    this.logicRules    = '';
    this.removeDups    = false;
    this.mode          = 'workspaces';
    this.stackScope    = 'current';
    this.selectedModel = 'gemini-2.0-flash';

    this.analyzedTabs  = null;
    this.allTabs       = [];

    this.lastReqTime   = 0;
    this.reqCount      = 0;

    this._init();
  }

  // ── Initialisation ───────────────────────────────────────────────────────

  async _init() {
    await this._loadSettings();
    await this._loadTracking();
    this._bind();
  }

  // ── Persistence ──────────────────────────────────────────────────────────

  async _loadSettings() {
    try {
      const d = await chrome.storage.local.get([
        'apiKey', 'categories', 'logicRules',
        'removeDuplicates', 'mode', 'stackScope', 'selectedModel',
      ]);
      if (d.apiKey)            { $('apiKey').value = d.apiKey;            this.apiKey = d.apiKey; }
      if (d.selectedModel)     { $('modelSelect').value = d.selectedModel; this.selectedModel = d.selectedModel; }
      if (d.categories)        { $('categories').value = d.categories;   this.categories = d.categories.split(',').map(c => c.trim()).filter(Boolean); }
      if (d.logicRules)        { $('logicRules').value = d.logicRules;   this.logicRules = d.logicRules; }
      if (d.removeDuplicates != null) { $('removeDuplicates').checked = d.removeDuplicates; this.removeDups = d.removeDuplicates; }
      if (d.stackScope)        { const el = $(d.stackScope === 'all' ? 'stackAllWindows' : 'stackCurrentWindow'); if (el) el.checked = true; this.stackScope = d.stackScope; }
      if (d.mode) {
        const r = $('mode' + d.mode.charAt(0).toUpperCase() + d.mode.slice(1));
        if (r) { r.checked = true; this.mode = d.mode; }
      }
      this._refreshUsage();
    } catch (e) { console.error('loadSettings:', e); }
  }

  async _save() {
    try {
      await chrome.storage.local.set({
        apiKey: this.apiKey,
        categories: this.categories.join(', '),
        logicRules: this.logicRules,
        removeDuplicates: this.removeDups,
        mode: this.mode,
        stackScope: this.stackScope,
        selectedModel: this.selectedModel,
      });
    } catch (e) { console.error('saveSettings:', e); }
  }

  // ── Request Tracking ─────────────────────────────────────────────────────

  async _loadTracking() {
    try {
      const d = await chrome.storage.local.get(['requestCount', 'lastResetDate']);
      const today = new Date().toDateString();
      if (d.lastResetDate !== today) {
        this.reqCount = 0;
        await chrome.storage.local.set({ requestCount: 0, lastResetDate: today });
      } else {
        this.reqCount = d.requestCount || 0;
      }
    } catch { this.reqCount = 0; }
  }

  async _bumpCount() {
    this.reqCount++;
    await chrome.storage.local.set({
      requestCount: this.reqCount,
      lastResetDate: new Date().toDateString(),
    });
  }

  async _resetCount() {
    const old = this.reqCount;
    this.reqCount = 0;
    await chrome.storage.local.set({ requestCount: 0, lastResetDate: new Date().toDateString() });
    this._refreshUsage();
    this._status(`✓ Counter reset (${old} → 0)`, 'success');
  }

  _refreshUsage() {
    const bar = $('usageInfo');
    const txt = $('usageText');
    if (this.reqCount > 0) {
      bar.classList.add('visible');
      const pct = Math.round((this.reqCount / DAILY_LIMIT) * 100);
      const clr = pct > 80 ? '#f56565' : pct > 60 ? '#ed8936' : '#48bb78';
      txt.innerHTML =
        `📊 Today: <span style="color:${clr};font-weight:700">${this.reqCount}/${DAILY_LIMIT}</span> requests (${pct}%)`;
    } else {
      bar.classList.remove('visible');
    }
  }

  // ── Event Binding ────────────────────────────────────────────────────────

  _bind() {
    $('apiKey').addEventListener('input', e => {
      this.apiKey = e.target.value.trim();
      this._save();
    });

    $('categories').addEventListener('input', e => {
      const clean = sanitizeHtmlTags(e.target.value);
      if (clean !== e.target.value) e.target.value = clean;
      this.categories = clean.split(',').map(c => c.trim()).filter(Boolean);
      this._save();
    });

    $('logicRules').addEventListener('input', e => {
      this.logicRules = e.target.value;
      this._save();
    });

    $('removeDuplicates').addEventListener('change', e => {
      this.removeDups = e.target.checked;
      this._save();
    });

    $('modelSelect').addEventListener('change', e => {
      this.selectedModel = e.target.value;
      this._save();
    });

    document.querySelectorAll('input[name="mode"]').forEach(r => {
      r.addEventListener('change', e => {
        this.mode = e.target.value;
        $('stackOptionsSection').style.display = this.mode === 'stacks' ? '' : 'none';
        this._updateWorkspaceSetup();
        this._save();
      });
    });
    $('stackOptionsSection').style.display = this.mode === 'stacks' ? '' : 'none';

    document.querySelectorAll('input[name="stackScope"]').forEach(r => {
      r.addEventListener('change', e => { this.stackScope = e.target.value; this._save(); });
    });

    $('analyzeBtn').addEventListener('click', () => this._analyze());
    $('applyBtn').addEventListener('click', () => this._apply());
    $('resetCounter').addEventListener('click', () => this._resetCount());
    $('refreshModelsBtn').addEventListener('click', () => this._fetchModels());
    $('checkBridgeBtn').addEventListener('click', () => this._checkBridge());
    $('downloadSetupBtn').addEventListener('click', () => this._downloadSetup());

    this._updateWorkspaceSetup();
  }

  // ── UI Helpers ───────────────────────────────────────────────────────────

  _status(msg, type) {
    const el = $('status');
    el.textContent = msg;
    el.className = 'visible ' + type;
  }

  _showPreview(cats) {
    const el = $('preview');
    el.innerHTML = '';

    const heading = document.createElement('div');
    heading.className = 'preview-heading';
    heading.textContent = '📊 Preview';
    el.appendChild(heading);

    let total = 0;
    for (const [cat, tabs] of Object.entries(cats)) {
      if (!tabs.length) continue;
      total += tabs.length;
      const row = document.createElement('div');
      row.className = 'preview-row';

      const name = document.createElement('span');
      name.className = 'preview-cat';
      name.textContent = cat;

      const count = document.createElement('span');
      count.className = 'preview-count';
      count.textContent = `${tabs.length} tab${tabs.length !== 1 ? 's' : ''}`;

      row.append(name, count);
      el.appendChild(row);
    }

    const footer = document.createElement('div');
    footer.className = 'preview-total';
    footer.textContent = `Total: ${total} tabs`;
    el.appendChild(footer);

    el.classList.add('visible');
  }

  // ── Workspace Setup ──────────────────────────────────────────────────────

  _updateWorkspaceSetup() {
    const section = $('workspaceSetupSection');
    section.style.display = this.mode === 'workspaces' ? '' : 'none';
    if (this.mode === 'workspaces') this._checkBridge();
  }

  async _checkBridge() {
    const indicator = $('bridgeStatus');
    const setupArea = $('bridgeSetupArea');
    indicator.textContent = '⏳ Checking workspace support…';
    indicator.className = 'bridge-indicator info';
    $('checkBridgeBtn').disabled = true;

    try {
      const result = await chrome.runtime.sendMessage({ action: 'checkWorkspaceSupport' });
      if (result?.available) {
        const label = result.method === 'direct' ? 'Direct API' : 'Bridge';
        indicator.textContent = `✅ ${label} connected – workspaces ready`;
        indicator.className = 'bridge-indicator success';
        setupArea.style.display = 'none';
      } else {
        indicator.textContent = '⚠️ Bridge not detected – install to enable workspaces';
        indicator.className = 'bridge-indicator warn';
        setupArea.style.display = '';
      }
    } catch {
      indicator.textContent = '⚠️ Could not check – install bridge for workspaces';
      indicator.className = 'bridge-indicator warn';
      setupArea.style.display = '';
    } finally {
      $('checkBridgeBtn').disabled = false;
    }
  }

  async _downloadSetup() {
    const ua = navigator.userAgent;
    const vivaldiVersionMatch = ua.match(/Vivaldi\/([\d.]+)/);
    const vivaldiVer = vivaldiVersionMatch ? vivaldiVersionMatch[1] : '<VERSION>';

    // Get bridge script content from background
    let bridgeCode;
    try {
      const resp = await chrome.runtime.sendMessage({ action: 'getBridgeScript' });
      bridgeCode = resp?.script || '';
    } catch {
      bridgeCode = '';
    }
    if (!bridgeCode) {
      this._status('Could not load bridge script.', 'error');
      return;
    }

    const isWin = /Win/.test(ua);
    const isMac = /Mac/.test(ua);

    let filename, content;

    if (isWin) {
      filename = 'install_bridge.ps1';
      content = this._genPowerShell(vivaldiVer, bridgeCode);
    } else if (isMac) {
      filename = 'install_bridge.sh';
      content = this._genBashMac(vivaldiVer, bridgeCode);
    } else {
      filename = 'install_bridge.sh';
      content = this._genBashLinux(bridgeCode);
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    const runCmd = isWin
      ? `Right-click ${filename} → "Run with PowerShell"`
      : `chmod +x ${filename} && ./${filename}`;
    this._status(`Downloaded ${filename}. Run it: ${runCmd}`, 'info');
  }

  _genPowerShell(ver, bridgeCode) {
    const escapedBridgeCode = bridgeCode.replace(/'/g, "''");
    return `# install_bridge.ps1 – Vivaldi AI Tab Sorter bridge installer
# Run: Right-click -> "Run with PowerShell"  (or:  powershell -ExecutionPolicy Bypass -File install_bridge.ps1)

$ErrorActionPreference = "Stop"

# Find Vivaldi resources directory
$base = "$env:LOCALAPPDATA\\Vivaldi\\Application"
if (-Not (Test-Path $base)) { Write-Error "Vivaldi not found at $base"; exit 1 }

$verDirs = Get-ChildItem $base -Directory | Where-Object { $_.Name -match '^[\\d.]+$' } | Sort-Object { [version]$_.Name } -Descending
if (-Not $verDirs) { Write-Error "No Vivaldi version folders found."; exit 1 }
$target = Join-Path $verDirs[0].FullName "resources\\vivaldi"
if (-Not (Test-Path "$target\\window.html")) { Write-Error "window.html not found in $target"; exit 1 }

Write-Host "Found Vivaldi at: $target" -ForegroundColor Cyan

# Backup
$backup = "$target\\window.html.backup"
if (-Not (Test-Path $backup)) {
  Copy-Item "$target\\window.html" $backup
  Write-Host "Backed up window.html" -ForegroundColor Green
}

# Write bridge script
$bridge = @'
${escapedBridgeCode}
'@
Set-Content -Path "$target\\ai_bridge.js" -Value $bridge -Encoding UTF8
Write-Host "Wrote ai_bridge.js" -ForegroundColor Green

# Patch window.html
$html = Get-Content "$target\\window.html" -Raw
if ($html -match 'ai_bridge\\.js') {
  Write-Host "Script tag already present – skipping." -ForegroundColor Yellow
} else {
  $html = $html -replace '</body>', '  <script src="ai_bridge.js"></script>\\n</body>'
  Set-Content -Path "$target\\window.html" -Value $html -Encoding UTF8
  Write-Host "Patched window.html" -ForegroundColor Green
}

Write-Host "\\nDone! Restart Vivaldi to activate the bridge." -ForegroundColor Cyan
`;
  }

  _genBashMac(ver, bridgeCode) {
    const escapedBridgeCode = bridgeCode.replace(/\\/g, '\\\\').replace(/'/g, "'\\''");
    return `#!/usr/bin/env bash
# install_bridge.sh – Vivaldi AI Tab Sorter bridge installer (macOS)
# Run:  chmod +x install_bridge.sh && ./install_bridge.sh

set -euo pipefail

BASE="/Applications/Vivaldi.app/Contents/Versions"
if [ ! -d "$BASE" ]; then echo "Vivaldi not found at $BASE"; exit 1; fi

VER=$(ls -1 "$BASE" | sort -V | tail -n1)
TARGET="$BASE/$VER/Vivaldi Framework.framework/Resources/vivaldi"
if [ ! -f "$TARGET/window.html" ]; then echo "window.html not found in $TARGET"; exit 1; fi

echo "Found Vivaldi at: $TARGET"

# Backup
[ ! -f "$TARGET/window.html.backup" ] && cp "$TARGET/window.html" "$TARGET/window.html.backup" && echo "Backed up window.html"

# Write bridge script
cat > "$TARGET/ai_bridge.js" << 'BRIDGEOF'
${escapedBridgeCode}
BRIDGEOF
echo "Wrote ai_bridge.js"

# Patch window.html
if grep -q 'ai_bridge\\.js' "$TARGET/window.html"; then
  echo "Script tag already present – skipping."
else
  sed -i '' 's|</body>|  <script src="ai_bridge.js"></script>\\n</body>|' "$TARGET/window.html"
  echo "Patched window.html"
fi

echo ""
echo "Done! Restart Vivaldi to activate the bridge."
`;
  }

  _genBashLinux(bridgeCode) {
    const escapedBridgeCode = bridgeCode.replace(/\\/g, '\\\\').replace(/'/g, "'\\''");
    return `#!/usr/bin/env bash
# install_bridge.sh – Vivaldi AI Tab Sorter bridge installer (Linux)
# Run:  chmod +x install_bridge.sh && sudo ./install_bridge.sh

set -euo pipefail

# Try common Vivaldi paths
for BASE in /opt/vivaldi/resources/vivaldi /usr/lib/vivaldi/resources/vivaldi /snap/vivaldi/current/opt/vivaldi/resources/vivaldi; do
  [ -f "$BASE/window.html" ] && TARGET="$BASE" && break
done
if [ -z "\${TARGET:-}" ]; then echo "Vivaldi resources not found. Check your install path."; exit 1; fi

echo "Found Vivaldi at: $TARGET"

# Backup
[ ! -f "$TARGET/window.html.backup" ] && cp "$TARGET/window.html" "$TARGET/window.html.backup" && echo "Backed up window.html"

# Write bridge script
cat > "$TARGET/ai_bridge.js" << 'BRIDGEOF'
${escapedBridgeCode}
BRIDGEOF
echo "Wrote ai_bridge.js"

# Patch window.html
if grep -q 'ai_bridge\\.js' "$TARGET/window.html"; then
  echo "Script tag already present – skipping."
else
  sed -i 's|</body>|  <script src="ai_bridge.js"></script>\\n</body>|' "$TARGET/window.html"
  echo "Patched window.html"
fi

echo ""
echo "Done! Restart Vivaldi to activate the bridge."
`;
  }

  // ── Model Fetching ───────────────────────────────────────────────────────

  async _fetchModels() {
    if (!this.apiKey) {
      this._status('Enter your API key first', 'error');
      return;
    }
    $('refreshModelsBtn').disabled = true;
    this._status('Fetching models…', 'info');
    try {
      const res = await fetch(`${GEMINI_API_BASE}/models?key=${this.apiKey}`);
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      const models = (data.models || []).filter(
        m => m.supportedGenerationMethods?.includes('generateContent') && m.name.includes('gemini'),
      );
      if (!models.length) { this._status('No compatible models found', 'error'); return; }

      const sel = $('modelSelect');
      const prev = sel.value;
      sel.innerHTML = '';
      for (const m of models) {
        const name = m.name.replace('models/', '');
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name + (name.includes('flash') ? ' (Fast)' : name.includes('pro') ? ' (Advanced)' : '');
        sel.appendChild(opt);
      }
      if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
      else { this.selectedModel = sel.value; this._save(); }

      this._status(`✓ Found ${models.length} models`, 'success');
    } catch (e) {
      this._status('Error fetching models: ' + sanitizeErrorMessage(e.message), 'error');
    } finally {
      $('refreshModelsBtn').disabled = false;
    }
  }

  // ── Tab Collection ───────────────────────────────────────────────────────

  async _getAllTabs() {
    const tabs = await chrome.tabs.query({});
    return tabs.map(t => ({ id: t.id, title: t.title || '', url: t.url || '', windowId: t.windowId, index: t.index }));
  }

  _dedup(tabs) {
    const seen = new Set();
    const unique = [];
    const dupeIds = [];
    for (const t of tabs) {
      if (seen.has(t.url)) { dupeIds.push(t.id); }
      else { seen.add(t.url); unique.push(t); }
    }
    if (dupeIds.length) {
      chrome.tabs.remove(dupeIds).catch(e => console.error('dedup:', e));
    }
    return unique;
  }

  // ── Gemini AI ────────────────────────────────────────────────────────────

  _buildPrompt(tabsInfo) {
    const cats = this.categories.join(', ');
    const rules = this.logicRules ? `\n\nCustom rules:\n${this.logicRules}` : '';
    return [
      `Categorize each browser tab into exactly ONE of these categories: ${cats}.`,
      rules,
      '\nTabs:\n' + JSON.stringify(tabsInfo, null, 2),
      '\nReturn ONLY a JSON array: [{"id":<tab_id>,"category":"<Category>"},…]',
    ].join('');
  }

  _parseResponse(text, origTabs) {
    let json = null;

    // Strategy 1 – markdown code block
    const md = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (md) json = md[1];

    // Strategy 2 – backtick content without regex match
    if (!json && text.includes('```')) {
      const parts = text.split('```');
      if (parts.length >= 3) {
        json = parts[1].replace(/^json\s*/i, '').trim();
      }
    }

    // Strategy 3 – greedy array extraction
    if (!json) {
      const m = text.match(/\[[\s\S]*\]/);
      if (m) json = m[0];
    }

    // Strategy 4 – entire text
    if (!json) json = text.trim();

    if (!json) throw new Error('Could not find JSON in AI response.');

    let arr;
    try { arr = JSON.parse(json); } catch (e) {
      throw new Error('Invalid JSON in AI response: ' + e.message);
    }
    if (!Array.isArray(arr)) throw new Error('AI response is not a JSON array.');
    if (!arr.length) throw new Error('AI returned an empty list.');

    const valid = arr.filter(i => i && i.id !== undefined && i.category);
    if (!valid.length) throw new Error('AI response items missing "id" or "category".');

    // Build category map
    const result = {};
    for (const c of this.categories) result[c] = [];
    result['Uncategorized'] = [];

    const lookup = new Map(valid.map(i => [i.id, i.category]));
    for (const t of origTabs) {
      const cat = lookup.get(t.id);
      (cat && result[cat] ? result[cat] : result['Uncategorized']).push(t);
    }
    return result;
  }

  async _callGemini(tabs) {
    const info = tabs.map(t => ({ id: t.id, title: t.title, url: t.url }));
    const prompt = this._buildPrompt(info);

    const maxRetries = 2;
    let lastErr = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const wait = 60000 * attempt;
        this._status(`Rate‑limited. Retrying in ${wait / 1000}s… (${attempt + 1}/${maxRetries + 1})`, 'info');
        await new Promise(r => setTimeout(r, wait));
      }

      this.lastReqTime = Date.now();

      try {
        const url = `${GEMINI_API_BASE}/models/${this.selectedModel}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, topK: 40, topP: 0.95, maxOutputTokens: 8192 },
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || res.statusText;
          const isQuota = /quota|exceeded/i.test(errMsg);
          const isRate = res.status === 429 || /rate.?limit/i.test(errMsg);

          if (isQuota) {
            throw new Error(
              'Google API quota exceeded. Free tier: 15 req/min, 1 500 req/day. '
              + 'Try again later or check usage at https://aistudio.google.com/',
            );
          }
          if (isRate && attempt < maxRetries) { lastErr = new Error(errMsg); continue; }
          throw new Error('Gemini API error: ' + errMsg);
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Empty response from Gemini.');

        await this._bumpCount();
        return this._parseResponse(text, tabs);
      } catch (e) {
        if ((e.message.includes('fetch') || e.message.includes('network')) && attempt < maxRetries) {
          lastErr = e;
          continue;
        }
        throw e;
      }
    }
    throw lastErr || new Error('Failed after retries.');
  }

  // ── Analyze Flow ─────────────────────────────────────────────────────────

  async _analyze() {
    try {
      if (!this.apiKey.trim()) { this._status('Enter your Gemini API key.', 'error'); return; }
      const key = this.apiKey.trim();
      if (!key.startsWith('AI') || key.length < 35) {
        this._status('Invalid API key format.', 'error'); return;
      }
      if (!this.categories.length) { this._status('Enter at least one category.', 'error'); return; }
      if (this.reqCount >= DAILY_LIMIT) {
        this._status(`Daily limit reached (${this.reqCount}/${DAILY_LIMIT}). Reset the counter or wait.`, 'error');
        this._refreshUsage();
        return;
      }

      // Rate‑limit throttle
      const elapsed = Date.now() - this.lastReqTime;
      if (elapsed < RPM_INTERVAL_MS && this.lastReqTime > 0) {
        const wait = Math.ceil((RPM_INTERVAL_MS - elapsed) / 1000);
        this._status(`Rate limit – wait ${wait}s…`, 'info');
        await new Promise(r => setTimeout(r, RPM_INTERVAL_MS - elapsed));
      }

      $('analyzeBtn').disabled = true;
      this._status('Collecting tabs…', 'info');

      this.allTabs = await this._getAllTabs();
      if (!this.allTabs.length) { this._status('No tabs found.', 'error'); $('analyzeBtn').disabled = false; return; }

      let tabs = this.allTabs;
      if (this.removeDups) {
        tabs = this._dedup(tabs);
        this._status(`Removed ${this.allTabs.length - tabs.length} duplicates. Analyzing ${tabs.length} tabs…`, 'info');
      } else {
        this._status(`Analyzing ${tabs.length} tabs… (request ${this.reqCount + 1}/${DAILY_LIMIT})`, 'info');
      }

      this.analyzedTabs = await this._callGemini(tabs);
      this._showPreview(this.analyzedTabs);
      $('applyBtn').disabled = false;
      this._refreshUsage();
      this._status('Analysis complete – review & apply.', 'success');
    } catch (e) {
      console.error('analyze:', e);
      this._status(sanitizeErrorMessage(e.message), 'error');
    } finally {
      $('analyzeBtn').disabled = false;
    }
  }

  // ── Apply Flow ───────────────────────────────────────────────────────────

  async _apply() {
    if (!this.analyzedTabs) { this._status('Run analysis first.', 'error'); return; }
    try {
      $('applyBtn').disabled = true;
      this._status('Applying…', 'info');

      if (this.mode === 'workspaces') await this._applyWorkspaces();
      else if (this.mode === 'stacks') await this._applyStacks();
      else await this._applyWindows();

      this._status('✅ Tabs sorted!', 'success');
      setTimeout(() => window.close(), 2000);
    } catch (e) {
      console.error('apply:', e);
      this._status(sanitizeErrorMessage(e.message), 'error');
      $('applyBtn').disabled = false;
    }
  }

  // ── Workspace Mode ───────────────────────────────────────────────────────

  async _applyWorkspaces() {
    const resp = await chrome.runtime.sendMessage({
      action: 'organizeToWorkspaces',
      categorizedTabs: this.analyzedTabs,
    });
    if (!resp?.success) throw new Error(resp?.error || 'Workspace organization failed.');
  }

  // ── Tab Stacks Mode ──────────────────────────────────────────────────────

  async _applyStacks() {
    let targetWin;
    const groups = [];

    if (this.stackScope === 'all') {
      const wins = await chrome.windows.getAll({ populate: true });
      targetWin = wins[0].id;

      // Move tabs from other windows first
      for (const [, tabs] of Object.entries(this.analyzedTabs)) {
        for (const t of tabs) {
          if (t.windowId !== targetWin) {
            try { await chrome.tabs.move(t.id, { windowId: targetWin, index: -1 }); } catch {}
          }
        }
      }

      // Re-query
      const fresh = await chrome.tabs.query({ windowId: targetWin });
      const map = new Map(fresh.map(t => [t.id, t]));
      for (const [cat, tabs] of Object.entries(this.analyzedTabs)) {
        const valid = tabs.map(t => map.get(t.id)).filter(Boolean);
        if (valid.length) groups.push({ cat, tabs: valid });
      }
    } else {
      const cur = await chrome.windows.getCurrent();
      targetWin = cur.id;
      for (const [cat, tabs] of Object.entries(this.analyzedTabs)) {
        const inWin = tabs.filter(t => t.windowId === targetWin);
        if (inWin.length) groups.push({ cat, tabs: inWin });
      }
    }

    if (!groups.length) throw new Error('No tabs to organise in selected scope.');

    let ci = 0;
    for (const { cat, tabs } of groups) {
      // Verify tabs still exist
      const ids = [];
      for (const t of tabs) {
        try { await chrome.tabs.get(t.id); ids.push(t.id); } catch {}
      }
      if (!ids.length) continue;

      const gid = await chrome.tabs.group({ tabIds: ids });
      await chrome.tabGroups.update(gid, {
        title: cat,
        color: GROUP_COLORS[ci % GROUP_COLORS.length],
        collapsed: false,
      });
      ci++;
    }
    await chrome.windows.update(targetWin, { focused: true });
  }

  // ── Window Mode ──────────────────────────────────────────────────────────

  async _applyWindows() {
    let ci = 0;
    for (const [cat, tabs] of Object.entries(this.analyzedTabs)) {
      if (!tabs.length) continue;

      const win = await chrome.windows.create({ tabId: tabs[0].id, focused: false });

      if (tabs.length > 1) {
        await chrome.tabs.move(tabs.slice(1).map(t => t.id), { windowId: win.id, index: -1 });
      }

      // Group inside the new window
      const winTabs = await chrome.tabs.query({ windowId: win.id });
      if (winTabs.length) {
        try {
          const gid = await chrome.tabs.group({ tabIds: winTabs.map(t => t.id) });
          await chrome.tabGroups.update(gid, {
            title: cat,
            color: GROUP_COLORS[ci % GROUP_COLORS.length],
            collapsed: false,
          });
        } catch {}
      }
      ci++;
    }
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => new TabSorter());
