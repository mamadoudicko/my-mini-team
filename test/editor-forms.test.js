'use strict';
// Tests for the step-editor modal's pure logic (zero deps).
const assert = require('assert');
const f = require('../lib/editor-forms');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; process.stdout.write('  ✓ ' + name + '\n'); }
  catch (e) { process.stdout.write('  ✗ ' + name + '\n    ' + e.message + '\n'); process.exitCode = 1; }
}

// --- deriveSkillOverride: the checkbox → override mapping (the tricky one) ---
test('override: desired === defaults → null (inherit)', () => {
  assert.strictEqual(f.deriveSkillOverride(['github-pr'], ['github-pr']), null);
});
test('override: superset of defaults → additive (+extras only)', () => {
  assert.deepStrictEqual(f.deriveSkillOverride(['github-pr'], ['github-pr', 'ticket-status']), ['+ticket-status']);
});
test('override: drops a default → replace (bare list)', () => {
  assert.deepStrictEqual(f.deriveSkillOverride(['github-pr', 'x'], ['github-pr']), ['github-pr']);
});
test('override: unticked everything → [] (replace with none)', () => {
  assert.deepStrictEqual(f.deriveSkillOverride(['github-pr'], []), []);
});
test('override: empty defaults + picks → bare replace (no spurious +)', () => {
  assert.deepStrictEqual(f.deriveSkillOverride([], ['web-search']), ['web-search']);
});
test('override: empty defaults + none → null', () => {
  assert.strictEqual(f.deriveSkillOverride([], []), null);
});
test('override: round-trips through mergeSkills (add + replace + inherit)', () => {
  const { mergeSkills } = require('../lib/model');
  const cases = [
    { d: ['a'], desired: ['a'] },
    { d: ['a'], desired: ['a', 'b'] },
    { d: ['a', 'b'], desired: ['c'] },
    { d: ['a'], desired: [] },
    { d: [], desired: ['z'] },
  ];
  for (const { d, desired } of cases) {
    const ov = f.deriveSkillOverride(d, desired);
    const eff = mergeSkills(d, ov);
    assert.deepStrictEqual(eff.sort(), [...new Set(desired)].sort(),
      `override ${JSON.stringify(ov)} did not reproduce desired ${JSON.stringify(desired)}`);
  }
});

// --- skillRows: display model ---
test('skillRows: defaults first, checked/default/added flags', () => {
  const rows = f.skillRows(['github-pr'], ['github-pr', 'ticket-status'], ['run-tests', 'ticket-status']);
  assert.deepStrictEqual(rows.map((r) => r.name), ['github-pr', 'run-tests', 'ticket-status']); // defaults first, deduped
  const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
  assert.deepStrictEqual([byName['github-pr'].checked, byName['github-pr'].isDefault, byName['github-pr'].isAdded], [true, true, false]);
  assert.deepStrictEqual([byName['ticket-status'].checked, byName['ticket-status'].isDefault, byName['ticket-status'].isAdded], [true, false, true]);
  assert.deepStrictEqual([byName['run-tests'].checked, byName['run-tests'].isDefault, byName['run-tests'].isAdded], [false, false, false]);
});

// --- toggleSkill ---
test('toggleSkill: adds then removes', () => {
  assert.deepStrictEqual(f.toggleSkill(['a'], 'b'), ['a', 'b']);
  assert.deepStrictEqual(f.toggleSkill(['a', 'b'], 'a'), ['b']);
});

// --- filterList ---
test('filterList: substring, case-insensitive, empty → all', () => {
  assert.deepStrictEqual(f.filterList(['coder', 'reviewer', 'qa'], 'RE'), ['reviewer']);
  assert.deepStrictEqual(f.filterList(['coder', 'reviewer'], ''), ['coder', 'reviewer']);
});

// --- applyChar ---
test('applyChar: append printable, backspace deletes, ignore ctrl', () => {
  assert.strictEqual(f.applyChar('ab', 'c', {}), 'abc');
  assert.strictEqual(f.applyChar('abc', '', { backspace: true }), 'ab');
  assert.strictEqual(f.applyChar('ab', 'c', { ctrl: true }), 'ab');
});

process.stdout.write('\n' + passed + ' passed\n');
