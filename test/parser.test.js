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
    '\nPrioritize the tab title for categorization; use the URL only as a secondary signal.',
    rules,
    '\nTabs:\n' + JSON.stringify(tabsInfo, null, 2),
    '\nReturn ONLY a JSON array: [{"id":<tab_id>,"category":"<Category>"},…]',
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

  const lookup = new Map(valid.map(i => [i.id, i.category]));
  for (const t of origTabs) {
    const cat = lookup.get(t.id);
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
  assert(prompt.includes('Prioritize the tab title'), 'instructs title-first priority');
  assert(prompt.includes('URL only as a secondary signal'), 'URL is secondary signal');
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
