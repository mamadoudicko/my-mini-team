'use strict';
// Plain-node test runner (zero deps) for the pure editor reducer.
//   node test/editor.test.js
const assert = require('assert');
const ed = require('../lib/editor');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; process.stdout.write('  ✓ ' + name + '\n'); }
  catch (e) { process.stdout.write('  ✗ ' + name + '\n    ' + e.message + '\n'); process.exitCode = 1; }
}
const names = (steps) => steps.map((s) => (s.type === 'loop' ? '[' + s.steps.map((m) => m.member).join(',') + ']' : s.member));

// A base team: strategist -> coder -> reviewer -> coder2 -> qa
const base = () => [
  ed.member({ uses: 'strategist', does: 'plan' }),
  ed.member({ uses: 'coder', does: 'build', skills: ['+ticket-status'] }),
  ed.member({ uses: 'reviewer', does: 'review' }),
  ed.member({ member: 'coder2', does: 'fix' }),
  ed.member({ uses: 'qa', does: 'test' }),
];

test('member(): defaults + skills null vs array', () => {
  assert.strictEqual(ed.member().member, 'member');
  assert.strictEqual(ed.member({ uses: 'coder' }).member, 'coder');   // name backfills from uses
  assert.strictEqual(ed.member().skills, null);                        // absent → null (inherit)
  assert.deepStrictEqual(ed.member({ skills: [] }).skills, []);        // explicit empty preserved
});

test('addStep(): inserts at index, clamps', () => {
  const s = ed.addStep(base(), 2, ed.member({ uses: 'security' }));
  assert.deepStrictEqual(names(s), ['strategist', 'coder', 'security', 'reviewer', 'coder2', 'qa']);
  assert.strictEqual(ed.addStep(base(), 99, ed.member({ uses: 'z' })).length, 6); // clamp high
  assert.strictEqual(ed.addStep(base(), -5, ed.member({ uses: 'z' }))[0].member, 'z'); // clamp low
});

test('removeAt(): top-level', () => {
  assert.deepStrictEqual(names(ed.removeAt(base(), 2)), ['strategist', 'coder', 'coder2', 'qa']);
});

test('move(): up/down + clamp at edges', () => {
  assert.deepStrictEqual(names(ed.move(base(), 1, -1)), ['coder', 'strategist', 'reviewer', 'coder2', 'qa']);
  assert.deepStrictEqual(names(ed.move(base(), 1, +1)), ['strategist', 'reviewer', 'coder', 'coder2', 'qa']);
  assert.deepStrictEqual(names(ed.move(base(), 0, -1)), names(base())); // clamp top
  assert.deepStrictEqual(names(ed.move(base(), 4, +1)), names(base())); // clamp bottom
});

test('wrapInLoop(): wraps a range into one loop', () => {
  const s = ed.wrapInLoop(base(), 2, 3, { until: 'reviewer approves', max_rounds: 3 });
  assert.deepStrictEqual(names(s), ['strategist', 'coder', '[reviewer,coder2]', 'qa']);
  assert.strictEqual(s[2].type, 'loop');
  assert.strictEqual(s[2].until, 'reviewer approves');
  assert.strictEqual(s[2].max_rounds, 3);
});

test('wrapInLoop(): rejects nesting a loop', () => {
  const withLoop = ed.wrapInLoop(base(), 2, 3);
  assert.throws(() => ed.wrapInLoop(withLoop, 1, 2), /cannot nest/);
});

test('unwrap(): splices inner members back to top level', () => {
  const wrapped = ed.wrapInLoop(base(), 2, 3);
  assert.deepStrictEqual(names(ed.unwrap(wrapped, 2)), names(base()));
});

test('addInner(): insert into a loop', () => {
  const wrapped = ed.wrapInLoop(base(), 2, 3);           // [reviewer,coder2] at index 2
  const s = ed.addInner(wrapped, 2, 1, ed.member({ uses: 'linter' }));
  assert.deepStrictEqual(s[2].steps.map((m) => m.member), ['reviewer', 'linter', 'coder2']);
});

test('removeAt(): inner; empties loop → drops the loop', () => {
  let wrapped = ed.wrapInLoop(base(), 2, 3);             // loop has 2 inner
  const s1 = ed.removeAt(wrapped, [2, 0]);               // remove reviewer
  assert.deepStrictEqual(s1[2].steps.map((m) => m.member), ['coder2']);
  const s2 = ed.removeAt(s1, [2, 0]);                    // remove last inner → loop dropped
  assert.deepStrictEqual(names(s2), ['strategist', 'coder', 'qa']);
});

test('move(): inner within a loop', () => {
  const wrapped = ed.wrapInLoop(base(), 2, 3);
  const s = ed.move(wrapped, [2, 0], +1);
  assert.deepStrictEqual(s[2].steps.map((m) => m.member), ['coder2', 'reviewer']);
});

test('update(): top-level patch (does/skills)', () => {
  const s = ed.update(base(), 0, { does: 'plan it well', skills: ['web-search'] });
  assert.strictEqual(ed.stepAt(s, 0).does, 'plan it well');
  assert.deepStrictEqual(ed.stepAt(s, 0).skills, ['web-search']);
});

test('update(): inner patch', () => {
  const wrapped = ed.wrapInLoop(base(), 2, 3);
  const s = ed.update(wrapped, [2, 1], { does: 'address comments' });
  assert.strictEqual(ed.stepAt(s, [2, 1]).does, 'address comments');
});

test('stepAt(): top and inner', () => {
  const wrapped = ed.wrapInLoop(base(), 2, 3);
  assert.strictEqual(ed.stepAt(wrapped, 0).member, 'strategist');
  assert.strictEqual(ed.stepAt(wrapped, [2, 1]).member, 'coder2');
  assert.strictEqual(ed.stepAt(wrapped, [2, 9]), undefined);
});

test('immutability: input is never mutated', () => {
  const s0 = base();
  const snapshot = JSON.stringify(s0);
  ed.addStep(s0, 1, ed.member({ uses: 'x' }));
  ed.removeAt(s0, 0);
  ed.move(s0, 1, +1);
  ed.wrapInLoop(s0, 2, 3);
  ed.update(s0, 0, { does: 'changed' });
  assert.strictEqual(JSON.stringify(s0), snapshot, 'reducer mutated its input');
});

process.stdout.write('\n' + passed + ' passed\n');
