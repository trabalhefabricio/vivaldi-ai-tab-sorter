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
    this.mode          = 'stacks';
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

      if (this.mode === 'stacks') await this._applyStacks();
      else await this._applyWindows();

      this._status('✅ Tabs sorted!', 'success');
      setTimeout(() => window.close(), 2000);
    } catch (e) {
      console.error('apply:', e);
      this._status(sanitizeErrorMessage(e.message), 'error');
      $('applyBtn').disabled = false;
    }
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
