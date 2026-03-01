#!/usr/bin/env node
'use strict';

// ── Extracted pure functions from popup.js ──────────────────────────────────

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

function buildPrompt(categories, logicRules, tabsInfo) {
  const cats = categories.join(', ');
  const rules = logicRules ? `\n\nCustom rules:\n${logicRules}` : '';
  return [
    `Categorize each browser tab into exactly ONE of these categories: ${cats}.`,
    '\nUse the EXACT category names listed above. Every tab MUST be assigned to one of these categories; do not skip any tab.',
    '\nUse BOTH the tab title and the URL to determine the best category. The title describes the specific content (e.g. a YouTube video about music production vs. one about gaming). The URL/domain shows the site. Both matter equally — same domain can belong to different categories depending on the title.',
    '\nAlways pick the closest matching category. Never leave a tab uncategorized if any category is even a partial match.',
    rules,
    '\nTabs:\n' + JSON.stringify(tabsInfo, null, 2),
    '\nReturn ONLY a JSON array with one entry per tab: [{"id":<tab_id>,"category":"<Category>"},…]',
  ].join('');
}

function parseResponse(text, origTabs, categories) {
  // Pre-process: strip outer markdown code fence wrapping
  let cleaned = text.trim();
  const fenceRe = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```\s*$/;
  const fenceMatch = cleaned.match(fenceRe);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  let json = null;

  // Strategy 1 – markdown code block (for inner fences)
  const md = cleaned.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  if (md) json = md[1];

  // Strategy 2 – backtick content without regex match
  if (!json && cleaned.includes('```')) {
    const parts = cleaned.split('```');
    if (parts.length >= 3) {
      json = parts[1].replace(/^json\s*/i, '').trim();
    }
  }

  // Strategy 3 – greedy array extraction
  if (!json) {
    const m = cleaned.match(/\[[\s\S]*\]/);
    if (m) json = m[0];
  }

  // Strategy 4 – entire cleaned text
  if (!json) json = cleaned;

  if (!json) throw new Error('Could not find JSON in AI response.');

  let arr;
  try { arr = JSON.parse(json); } catch (e) {
    // Attempt to recover truncated JSON (e.g. token limit cut off the response)
    const repaired = repairTruncatedJSON(json);
    if (repaired) { arr = repaired; }
    else { throw new Error('Invalid JSON in AI response: ' + e.message); }
  }
  if (!Array.isArray(arr)) throw new Error('AI response is not a JSON array.');
  if (!arr.length) throw new Error('AI returned an empty list.');

  const valid = arr.filter(i => i && i.id !== undefined && i.category);
  if (!valid.length) throw new Error('AI response items missing "id" or "category".');

  // Build category map
  const result = {};
  for (const c of categories) result[c] = [];
  result['Uncategorized'] = [];

  // Case-insensitive category resolver for AI responses
  const catNorm = new Map(categories.map(c => [c.toLowerCase().trim(), c]));

  // Coerce IDs to numbers so string "1" matches numeric 1
  const lookup = new Map(valid.map(i => [Number(i.id), i.category]));
  for (const t of origTabs) {
    let cat = lookup.get(t.id);
    if (cat) {
      cat = cat.trim();
      if (!result[cat]) cat = catNorm.get(cat.toLowerCase()) || null;
    }
    (cat && result[cat] ? result[cat] : result['Uncategorized']).push(t);
  }
  return result;
}

function repairTruncatedJSON(json) {
  // Find the last complete object closing brace
  const lastBrace = json.lastIndexOf('}');
  if (lastBrace === -1) return null;

  // Take everything up to and including the last '}'
  let repaired = json.substring(0, lastBrace + 1).replace(/,\s*$/, '');

  // Ensure it starts with '['
  const start = repaired.indexOf('[');
  if (start === -1) return null;
  repaired = repaired.substring(start) + ']';

  try {
    const arr = JSON.parse(repaired);
    if (Array.isArray(arr) && arr.length > 0) return arr;
  } catch { /* repair failed */ }
  return null;
}

function normalizeTab(t) {
  return {
    id: t.id,
    title: t.title || '',
    url: t.url || t.pendingUrl || '',
    windowId: t.windowId,
    index: t.index,
  };
}

function dedup(tabs) {
  const seen = new Set();
  const unique = [];
  const dupeIds = [];
  for (const t of tabs) {
    if (!t.url) { unique.push(t); continue; }
    if (seen.has(t.url)) { dupeIds.push(t.id); }
    else { seen.add(t.url); unique.push(t); }
  }
  return { unique, dupeIds };
}

// ── Test runner ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    console.error(`    expected: ${JSON.stringify(expected)}`);
    console.error(`    actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

function assertThrows(fn, pattern, message) {
  try {
    fn();
    console.error(`  ✗ ${message} (did not throw)`);
    failed++;
  } catch (e) {
    if (pattern && !e.message.includes(pattern)) {
      console.error(`  ✗ ${message} (wrong error: "${e.message}")`);
      failed++;
    } else {
      console.log(`  ✓ ${message}`);
      passed++;
    }
  }
}

// ── Test data ───────────────────────────────────────────────────────────────

const sampleTabs = [
  { id: 1, title: 'GitHub', url: 'https://github.com' },
  { id: 2, title: 'Gmail', url: 'https://mail.google.com' },
  { id: 3, title: 'YouTube', url: 'https://youtube.com' },
];
const sampleCategories = ['Dev', 'Email', 'Media'];

// ── Tests: parseResponse ────────────────────────────────────────────────────

console.log('\n📋 parseResponse');

console.log('\n  ─ plain JSON array');
{
  const input = '[{"id":1,"category":"Dev"},{"id":2,"category":"Email"},{"id":3,"category":"Media"}]';
  const result = parseResponse(input, sampleTabs, sampleCategories);
  assertEqual(result['Dev'].length, 1, 'Dev has 1 tab');
  assertEqual(result['Dev'][0].id, 1, 'Dev tab is GitHub');
  assertEqual(result['Email'].length, 1, 'Email has 1 tab');
  assertEqual(result['Media'].length, 1, 'Media has 1 tab');
  assertEqual(result['Uncategorized'].length, 0, 'No uncategorized tabs');
}

console.log('\n  ─ JSON in markdown code block');
{
  const input = 'Here are the results:\n```json\n[{"id":1,"category":"Dev"},{"id":2,"category":"Email"},{"id":3,"category":"Media"}]\n```\nDone!';
  const result = parseResponse(input, sampleTabs, sampleCategories);
  assertEqual(result['Dev'].length, 1, 'Dev has 1 tab from markdown block');
  assertEqual(result['Media'].length, 1, 'Media has 1 tab from markdown block');
}

console.log('\n  ─ JSON in plain backticks (no json marker)');
{
  const input = '```\n[{"id":1,"category":"Dev"},{"id":2,"category":"Email"},{"id":3,"category":"Media"}]\n```';
  const result = parseResponse(input, sampleTabs, sampleCategories);
  assertEqual(result['Dev'].length, 1, 'Dev has 1 tab from plain backtick block');
}

console.log('\n  ─ JSON with surrounding text');
{
  const input = 'Sure! Here is the categorization:\n[{"id":1,"category":"Dev"},{"id":2,"category":"Email"},{"id":3,"category":"Media"}]\nLet me know if you need anything else.';
  const result = parseResponse(input, sampleTabs, sampleCategories);
  assertEqual(result['Dev'].length, 1, 'Dev has 1 tab from surrounded text');
}

console.log('\n  ─ unknown category goes to Uncategorized');
{
  const input = '[{"id":1,"category":"Unknown"},{"id":2,"category":"Email"},{"id":3,"category":"Media"}]';
  const result = parseResponse(input, sampleTabs, sampleCategories);
  assertEqual(result['Uncategorized'].length, 1, 'unknown cat → Uncategorized');
  assertEqual(result['Uncategorized'][0].id, 1, 'GitHub went to Uncategorized');
}

console.log('\n  ─ case-insensitive category matching');
{
  const input = '[{"id":1,"category":"dev"},{"id":2,"category":"EMAIL"},{"id":3,"category":"media"}]';
  const result = parseResponse(input, sampleTabs, sampleCategories);
  assertEqual(result['Dev'].length, 1, 'lowercase "dev" matched Dev');
  assertEqual(result['Email'].length, 1, 'uppercase "EMAIL" matched Email');
  assertEqual(result['Media'].length, 1, 'lowercase "media" matched Media');
  assertEqual(result['Uncategorized'].length, 0, 'no uncategorized with case mismatch');
}

console.log('\n  ─ string tab IDs coerced to numbers');
{
  const input = '[{"id":"1","category":"Dev"},{"id":"2","category":"Email"},{"id":"3","category":"Media"}]';
  const result = parseResponse(input, sampleTabs, sampleCategories);
  assertEqual(result['Dev'].length, 1, 'string ID "1" matched numeric 1');
  assertEqual(result['Email'].length, 1, 'string ID "2" matched numeric 2');
  assertEqual(result['Media'].length, 1, 'string ID "3" matched numeric 3');
  assertEqual(result['Uncategorized'].length, 0, 'no uncategorized with string IDs');
}

console.log('\n  ─ category names with surrounding whitespace');
{
  const input = '[{"id":1,"category":" Dev "},{"id":2,"category":"Email "},{"id":3,"category":" Media"}]';
  const result = parseResponse(input, sampleTabs, sampleCategories);
  assertEqual(result['Dev'].length, 1, 'whitespace-padded " Dev " matched Dev');
  assertEqual(result['Email'].length, 1, 'trailing space "Email " matched Email');
  assertEqual(result['Media'].length, 1, 'leading space " Media" matched Media');
  assertEqual(result['Uncategorized'].length, 0, 'no uncategorized with whitespace');
}

console.log('\n  ─ combined: string IDs + wrong case + whitespace');
{
  const input = '[{"id":"1","category":" dev "},{"id":"2","category":"EMAIL"},{"id":"3","category":"media "}]';
  const result = parseResponse(input, sampleTabs, sampleCategories);
  assertEqual(result['Dev'].length, 1, 'combined issues: " dev " → Dev');
  assertEqual(result['Email'].length, 1, 'combined issues: "EMAIL" → Email');
  assertEqual(result['Media'].length, 1, 'combined issues: "media " → Media');
  assertEqual(result['Uncategorized'].length, 0, 'no uncategorized with combined issues');
}

console.log('\n  ─ invalid JSON');
assertThrows(
  () => parseResponse('not json at all {broken', sampleTabs, sampleCategories),
  'Invalid JSON',
  'throws on invalid JSON'
);

console.log('\n  ─ empty response');
assertThrows(
  () => parseResponse('', sampleTabs, sampleCategories),
  null,
  'throws on empty response'
);

console.log('\n  ─ empty array');
assertThrows(
  () => parseResponse('[]', sampleTabs, sampleCategories),
  'empty list',
  'throws on empty array'
);

console.log('\n  ─ missing fields');
assertThrows(
  () => parseResponse('[{"foo":"bar"}]', sampleTabs, sampleCategories),
  'missing "id" or "category"',
  'throws when items lack id/category'
);

console.log('\n  ─ non-array JSON');
assertThrows(
  () => parseResponse('{"id":1,"category":"Dev"}', sampleTabs, sampleCategories),
  'not a JSON array',
  'throws on non-array JSON'
);

console.log('\n  ─ entire response wrapped in ```json fence (reported bug)');
{
  const input = '```json\n[{"id":1,"category":"Dev"},{"id":2,"category":"Email"},{"id":3,"category":"Media"}]\n```';
  const result = parseResponse(input, sampleTabs, sampleCategories);
  assertEqual(result['Dev'].length, 1, 'Dev has 1 tab from fence-wrapped response');
  assertEqual(result['Email'].length, 1, 'Email has 1 tab from fence-wrapped response');
  assertEqual(result['Media'].length, 1, 'Media has 1 tab from fence-wrapped response');
}

console.log('\n  ─ fence-wrapped multiline JSON');
{
  const input = '```json\n[\n  {"id":1,"category":"Dev"},\n  {"id":2,"category":"Email"},\n  {"id":3,"category":"Media"}\n]\n```';
  const result = parseResponse(input, sampleTabs, sampleCategories);
  assertEqual(result['Dev'].length, 1, 'Dev has 1 tab from multiline fence');
  assertEqual(result['Media'].length, 1, 'Media has 1 tab from multiline fence');
}

console.log('\n  ─ fence-wrapped with no json marker');
{
  const input = '```\n[{"id":1,"category":"Dev"},{"id":2,"category":"Email"},{"id":3,"category":"Media"}]\n```';
  const result = parseResponse(input, sampleTabs, sampleCategories);
  assertEqual(result['Dev'].length, 1, 'Dev has 1 tab from plain fence');
}

console.log('\n  ─ fence-wrapped with trailing whitespace');
{
  const input = '```json\n[{"id":1,"category":"Dev"},{"id":2,"category":"Email"},{"id":3,"category":"Media"}]\n```\n  ';
  const result = parseResponse(input, sampleTabs, sampleCategories);
  assertEqual(result['Dev'].length, 1, 'Dev has 1 tab with trailing whitespace');
}

console.log('\n  ─ truncated JSON: unterminated string (reported bug)');
{
  // AI hit token limit mid-string — "Me" is cut off (should be "Media")
  const input = '[{"id":1,"category":"Dev"},{"id":2,"category":"Email"},{"id":3,"category":"Me';
  const result = parseResponse(input, sampleTabs, sampleCategories);
  assertEqual(result['Dev'].length, 1, 'Dev recovered from truncated JSON');
  assertEqual(result['Email'].length, 1, 'Email recovered from truncated JSON');
  assertEqual(result['Uncategorized'].length, 1, 'truncated tab → Uncategorized');
}

console.log('\n  ─ truncated JSON: cut off after complete objects with trailing comma');
{
  const input = '[{"id":1,"category":"Dev"},{"id":2,"category":"Email"},';
  const result = parseResponse(input, sampleTabs, sampleCategories);
  assertEqual(result['Dev'].length, 1, 'Dev recovered from trailing comma truncation');
  assertEqual(result['Email'].length, 1, 'Email recovered from trailing comma truncation');
}

console.log('\n  ─ truncated JSON: cut off mid-key');
{
  const input = '[{"id":1,"category":"Dev"},{"id":2,"category":"Email"},{"id":3,"categ';
  const result = parseResponse(input, sampleTabs, sampleCategories);
  assertEqual(result['Dev'].length, 1, 'Dev recovered from mid-key truncation');
  assertEqual(result['Email'].length, 1, 'Email recovered from mid-key truncation');
}

console.log('\n  ─ truncated JSON: fence-wrapped truncated response');
{
  const input = '```json\n[{"id":1,"category":"Dev"},{"id":2,"category":"Ema';
  const result = parseResponse(input, sampleTabs, sampleCategories);
  assertEqual(result['Dev'].length, 1, 'Dev recovered from fence-wrapped truncation');
}

console.log('\n  ─ truncated JSON: only one complete object');
{
  const input = '[{"id":1,"category":"Dev"},{"id":2,"cat';
  const result = parseResponse(input, sampleTabs, sampleCategories);
  assertEqual(result['Dev'].length, 1, 'Dev recovered with single complete object');
}

console.log('\n  ─ truncated JSON: no complete objects → still throws');
assertThrows(
  () => parseResponse('[{"id":1,"cate', sampleTabs, sampleCategories),
  'Invalid JSON',
  'throws when no complete objects can be recovered'
);

// ── Tests: buildPrompt ──────────────────────────────────────────────────────

console.log('\n📋 buildPrompt');

{
  const prompt = buildPrompt(['Dev', 'Email'], '', [{ id: 1, title: 'test', url: 'http://test.com' }]);
  assert(prompt.includes('Dev, Email'), 'includes categories');
  assert(prompt.includes('"id": 1'), 'includes tab data');
  assert(!prompt.includes('Custom rules'), 'no custom rules when empty');
  assert(prompt.includes('BOTH the tab title and the URL'), 'instructs to use title and URL');
  assert(prompt.includes('Both matter equally'), 'title and URL weighted equally');
  assert(prompt.includes('closest matching category'), 'instructs closest match');
  assert(prompt.includes('EXACT category names'), 'instructs exact category names');
  assert(prompt.includes('do not skip any tab'), 'instructs not to skip tabs');
}

{
  const prompt = buildPrompt(['Dev'], 'Put GitHub in Dev', [{ id: 1, title: 'test', url: 'http://test.com' }]);
  assert(prompt.includes('Custom rules'), 'includes custom rules header');
  assert(prompt.includes('Put GitHub in Dev'), 'includes rule text');
}

// ── Tests: sanitizeHtmlTags ─────────────────────────────────────────────────

console.log('\n📋 sanitizeHtmlTags');

assertEqual(sanitizeHtmlTags('hello'), 'hello', 'no tags unchanged');
assertEqual(sanitizeHtmlTags('<b>bold</b>'), 'bold', 'strips simple tags');
assertEqual(sanitizeHtmlTags('<script>alert("xss")</script>'), 'alert("xss")', 'strips script tags');
assertEqual(sanitizeHtmlTags('a<br>b'), 'ab', 'strips self-closing tags');
assertEqual(sanitizeHtmlTags('<a href="x">link</a>'), 'link', 'strips tags with attributes');
assertEqual(sanitizeHtmlTags('<<b>nested</b>>'), 'nested>', 'handles nested angle brackets');
assertEqual(sanitizeHtmlTags(''), '', 'empty string unchanged');

// ── Tests: sanitizeErrorMessage ─────────────────────────────────────────────

console.log('\n📋 sanitizeErrorMessage');

assertEqual(sanitizeErrorMessage(null), 'An unknown error occurred', 'null → default');
assertEqual(sanitizeErrorMessage(''), 'An unknown error occurred', 'empty → default');
assertEqual(sanitizeErrorMessage(undefined), 'An unknown error occurred', 'undefined → default');

{
  const key = 'AIzaSyB' + 'x'.repeat(30);
  const msg = `Error with key ${key} failed`;
  const result = sanitizeErrorMessage(msg);
  assert(!result.includes(key), 'API key is redacted');
  assert(result.includes('[REDACTED]'), 'replaced with [REDACTED]');
}

{
  const msg = 'Failed: https://api.example.com/v1/foo?key=secret&bar=baz';
  const result = sanitizeErrorMessage(msg);
  assert(!result.includes('secret'), 'URL with params is redacted');
  assert(result.includes('[URL]'), 'replaced with [URL]');
}

{
  const msg = 'Simple error without secrets';
  assertEqual(sanitizeErrorMessage(msg), msg, 'clean message unchanged');
}

{
  const msg = 'x'.repeat(300);
  const result = sanitizeErrorMessage(msg);
  assert(result.length <= 251, 'long message is truncated');
  assert(result.endsWith('…'), 'truncated message ends with ellipsis');
}

// ── Tests: Bridge Code Preservation ─────────────────────────────────────────

console.log('\n📋 Bridge Code Preservation');

// The installer scripts use heredoc/here-string syntax that treats content literally.
// The bridge code must NOT be escaped for these contexts.

{
  const bridgeCode = "if (typeof vivaldi === 'undefined') { console.warn('[AI Tab Sorter] not available'); }";

  // Old PowerShell escaping doubled single quotes – verify this corrupts the code
  const wrongPs = bridgeCode.replace(/'/g, "''");
  assert(wrongPs !== bridgeCode, 'old PS escaping modifies bridge code (confirms bug)');
  assert(wrongPs.includes("''undefined''"), 'old PS escaping doubles quotes');

  // Correct approach: no escaping for @'...'@ literal here-string
  assert(bridgeCode.includes("=== 'undefined'"), 'unescaped code preserves single quotes');
  assert(bridgeCode.includes("'[AI Tab Sorter]"), 'unescaped code preserves bracket quotes');
}

{
  const bridgeCode = "if (typeof vivaldi === 'undefined') { console.warn('[AI Tab Sorter] not available'); }";

  // Old Bash escaping shell-escaped single quotes – verify this corrupts the code
  const wrongBash = bridgeCode.replace(/\\/g, '\\\\').replace(/'/g, "'\\''");
  assert(wrongBash !== bridgeCode, 'old Bash escaping modifies bridge code (confirms bug)');
  assert(wrongBash.includes("'\\''undefined'\\''"), 'old Bash escaping shell-escapes quotes');

  // Correct approach: no escaping for << 'HEREDOC' (quoted delimiter = literal content)
  assert(bridgeCode.includes("=== 'undefined'"), 'unescaped code preserves quotes for heredoc');
}

// ── Tests: Tab Hibernation Handling ──────────────────────────────────────────

console.log('\n📋 Tab Hibernation Handling');

console.log('\n  ─ normalizeTab uses pendingUrl as URL fallback');
{
  const tab = { id: 1, title: 'GitHub', url: '', pendingUrl: 'https://github.com', windowId: 1, index: 0 };
  const result = normalizeTab(tab);
  assertEqual(result.url, 'https://github.com', 'pendingUrl used when url is empty');
}

{
  const tab = { id: 2, title: 'Gmail', url: undefined, pendingUrl: 'https://mail.google.com', windowId: 1, index: 1 };
  const result = normalizeTab(tab);
  assertEqual(result.url, 'https://mail.google.com', 'pendingUrl used when url is undefined');
}

{
  const tab = { id: 3, title: 'YouTube', url: 'https://youtube.com', pendingUrl: 'https://youtube.com/watch', windowId: 1, index: 2 };
  const result = normalizeTab(tab);
  assertEqual(result.url, 'https://youtube.com', 'url preferred over pendingUrl when both present');
}

{
  const tab = { id: 4, title: '', url: '', pendingUrl: '', windowId: 1, index: 3 };
  const result = normalizeTab(tab);
  assertEqual(result.url, '', 'empty string when both url and pendingUrl are empty');
  assertEqual(result.title, '', 'empty title preserved');
}

console.log('\n  ─ dedup skips tabs with empty URLs');
{
  const tabs = [
    { id: 1, title: 'GitHub', url: 'https://github.com' },
    { id: 2, title: '', url: '' },
    { id: 3, title: '', url: '' },
    { id: 4, title: 'Gmail', url: 'https://mail.google.com' },
  ];
  const { unique, dupeIds } = dedup(tabs);
  assertEqual(unique.length, 4, 'empty-URL tabs not deduped against each other');
  assertEqual(dupeIds.length, 0, 'no tabs flagged as duplicates');
}

{
  const tabs = [
    { id: 1, title: 'GitHub', url: 'https://github.com' },
    { id: 2, title: 'GitHub 2', url: 'https://github.com' },
    { id: 3, title: '', url: '' },
  ];
  const { unique, dupeIds } = dedup(tabs);
  assertEqual(unique.length, 2, 'real duplicate still detected');
  assertEqual(dupeIds, [2], 'duplicate tab ID identified');
}

// ── Tests: Title From URL (hibernated tab fallback) ─────────────────────────

console.log('\n📋 Title From URL (hibernated tab fallback)');

function titleFromUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    let name = u.hostname.replace(/^www\./, '');
    if (u.pathname && u.pathname !== '/') {
      const path = decodeURIComponent(u.pathname)
        .replace(/\/$/, '')
        .replace(/[/_-]+/g, ' ')
        .trim();
      if (path) name += ' – ' + path;
    }
    return name || url;
  } catch {
    return url;
  }
}

console.log('\n  ─ derives readable names from URLs');

{
  assertEqual(titleFromUrl('https://github.com'), 'github.com', 'root domain');
  assertEqual(titleFromUrl('https://www.github.com'), 'github.com', 'strips www.');
  assertEqual(titleFromUrl('https://github.com/user/repo'), 'github.com – user repo', 'path segments');
  assertEqual(titleFromUrl('https://docs.google.com/document/d/abc'), 'docs.google.com – document d abc', 'deep path');
  assertEqual(titleFromUrl('https://en.wikipedia.org/wiki/JavaScript'), 'en.wikipedia.org – wiki JavaScript', 'Wikipedia path');
  assertEqual(titleFromUrl('http://localhost:3000'), 'localhost', 'localhost');
}

console.log('\n  ─ edge cases');

{
  assertEqual(titleFromUrl(''), '', 'empty URL returns empty');
  assertEqual(titleFromUrl('about:blank'), ' – blank', 'about:blank derives from pathname');
  assertEqual(titleFromUrl('chrome://extensions/'), 'extensions', 'chrome:// uses hostname');
  assertEqual(titleFromUrl('https://www.fiverr.com/categories/programming-tech'),
    'fiverr.com – categories programming tech', 'Fiverr path is readable');
}

// ── Results ─────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('\n❌ Some tests failed.');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed.');
  process.exit(0);
}
