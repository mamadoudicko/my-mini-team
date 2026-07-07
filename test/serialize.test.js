'use strict';
// Round-trip test: normalize → teamToYaml → parse → normalize must be stable.
const assert = require('assert');
const yaml = require('../lib/yaml');
const { normalizeTeam } = require('../lib/model');
const { teamToYaml } = require('../lib/serialize');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; process.stdout.write('  ✓ ' + name + '\n'); }
  catch (e) { process.stdout.write('  ✗ ' + name + '\n    ' + e.message + '\n'); process.exitCode = 1; }
}

const raw = {
  team: 'spec-to-prod',
  about: 'take a spec to prod: plan, build, review, qa',
  steps: [
    { uses: 'strategist', does: 'plan' },
    { uses: 'coder', does: 'build and open a PR', skills: ['+ticket-status'] },
    { loop: { until: 'reviewer approves', max_rounds: 3, steps: [
      { uses: 'reviewer', does: 'review the diff' },
      { member: 'coder2', does: 'address comments', skills: [] },
    ] } },
    { uses: 'qa', does: 'run tests', skills: ['run-tests', '+github-post'], model: 'haiku' },
  ],
};

test('round-trip: normalize → yaml → parse → normalize is stable', () => {
  const original = normalizeTeam(raw);
  const roundtrip = normalizeTeam(yaml.parse(teamToYaml(original)));
  assert.deepStrictEqual(roundtrip, original);
});

test('skills: null (inherit) vs [] (replace) preserved across round-trip', () => {
  const t = normalizeTeam({ team: 't', steps: [
    { uses: 'a', does: 'x' },            // absent → null (inherit)
    { uses: 'b', does: 'y', skills: [] }, // explicit empty → replace-with-none
  ] });
  const rt = normalizeTeam(yaml.parse(teamToYaml(t)));
  assert.strictEqual(rt.steps[0].skills, null, 'inherit (null) lost');
  assert.deepStrictEqual(rt.steps[1].skills, [], 'explicit empty lost');
});

test('uses vs member preserved', () => {
  const t = normalizeTeam({ team: 't', steps: [
    { uses: 'coder', does: 'a' },
    { member: 'oneoff', does: 'b' },
  ] });
  const rt = normalizeTeam(yaml.parse(teamToYaml(t)));
  assert.strictEqual(rt.steps[0].uses, 'coder');
  assert.strictEqual(rt.steps[1].uses, null);
  assert.strictEqual(rt.steps[1].member, 'oneoff');
});

test('special characters in does are quoted and survive', () => {
  const t = normalizeTeam({ team: 't', steps: [
    { uses: 'a', does: 'ship: the PDF export # now' },
  ] });
  const rt = normalizeTeam(yaml.parse(teamToYaml(t)));
  assert.strictEqual(rt.steps[0].does, 'ship: the PDF export # now');
});

process.stdout.write('\n' + passed + ' passed\n');
