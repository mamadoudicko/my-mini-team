'use strict';
// lib/bundle.js: plain-directory team bundles (collect/writeDir/readDir/
// manifest/footprint) + the non-TTY mmt import <dir> CLI path.
//
// Sandboxes HOME to a throwaway dir so store/agents/skills (which all key off
// os.homedir()) never touch the real ~/.claude or ~/.my-mini-team. process.cwd()
// stays the repo root (agents.js/skills.js check a PROJECT source there too),
// so fixture names are picked to avoid the repo's real .claude/agents/*.md.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; process.stdout.write('  ✓ ' + name + '\n'); }
  catch (e) { process.stdout.write('  ✗ ' + name + '\n    ' + (e.stack || e.message).split('\n').slice(0, 4).join('\n    ') + '\n'); process.exitCode = 1; }
}

const REPO_ROOT = path.join(__dirname, '..');
const REAL_HOME = os.homedir();

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'mmt-bundle-home-'));
process.env.HOME = tmpHome;
process.env.USERPROFILE = tmpHome;

const bundle = require('../lib/bundle');
const store = require('../lib/store');

function writeFixtureAgent(name, content) {
  const dir = path.join(tmpHome, '.claude', 'agents');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name + '.md'), content);
}
function writeFixtureSkill(name, content) {
  const dir = path.join(tmpHome, '.claude', 'skills', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), content);
}
function writeFixtureTeam(name, yamlText) {
  const dir = path.join(tmpHome, '.my-mini-team', 'teams');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name + '.team.yaml'), yamlText);
}

// --- fixtures (unique names — the repo's real .claude/agents/*.md, checked
// out at cwd, is a PROJECT source that shadows a same-named USER fixture) ---
writeFixtureAgent('demo-builder', [
  '---',
  'name: demo-builder',
  'description: builds things',
  'model: sonnet',
  'skills: [demo-skill-a]',
  '---',
  '',
  '# demo-builder',
  '',
  'Write the code. Occasionally run `git status` to check your work.',
  '',
].join('\n'));
writeFixtureSkill('demo-skill-a', '---\nname: demo-skill-a\ndescription: a demo skill\n---\n\n# demo-skill-a\n\nDoes a demo thing.\n');
writeFixtureSkill('demo-skill-b', '---\nname: demo-skill-b\ndescription: another demo skill\n---\n\n# demo-skill-b\n\nA harmless note — nothing to see, no digits either.\n');

const specPublishContent = fs.readFileSync(
  path.join(REPO_ROOT, 'catalog', 'mamadoudicko', 'idea-to-spec', 'skills', 'spec-publish', 'SKILL.md'), 'utf8');
writeFixtureSkill('spec-publish', specPublishContent);

const ideaToSpecYaml = fs.readFileSync(
  path.join(REPO_ROOT, 'catalog', 'mamadoudicko', 'idea-to-spec', 'idea-to-spec.team.yaml'), 'utf8');
writeFixtureTeam('idea-to-spec', ideaToSpecYaml);

const usesDemoYaml = [
  'team: uses-demo',
  'about: exercises uses: skill-merge and unresolved classification',
  'steps:',
  '  - uses: demo-builder',
  '    does: build it',
  '    skills: [+demo-skill-b]',
  '',
  '  - member: reviewer-extra',
  '    does: review it',
  '    skills: [+demo-unknown]',
  '',
  '  - member: path-user',
  '    does: something with a path-style skill ref',
  '    skills: [../shared/thing.md]',
  '',
  '  - uses: ghost-agent',
  '    does: nothing resolves here',
  '',
].join('\n');
writeFixtureTeam('uses-demo', usesDemoYaml);

// --- 1. member-only step-level skills (catalog idea-to-spec shape) ---
test('collect: member-only step-level skills are bundled (idea-to-spec), 0 agents', () => {
  const team = store.loadTeam('idea-to-spec');
  assert.ok(team, 'fixture team not found via store');
  const b = bundle.collect(team);
  assert.strictEqual(b.agents.length, 0);
  assert.deepStrictEqual(b.unresolved.agents, []);
  assert.ok(b.skills.some((s) => s.name === 'spec-publish'), 'spec-publish missing from collect().skills');
});

// --- 2 & 3. uses: agent default + '+extra' merge, and unresolved classification ---
const usesDemoTeam = store.loadTeam('uses-demo');
const usesDemoBundle = bundle.collect(usesDemoTeam);

test('collect: uses: step merges agent default + "+extra" skill, deduped and de-+\'d', () => {
  const names = usesDemoBundle.skills.map((s) => s.name).sort();
  assert.deepStrictEqual(names, ['demo-skill-a', 'demo-skill-b']);
  assert.ok(usesDemoBundle.agents.some((a) => a.name === 'demo-builder'));
});

test('collect: unresolvable uses: goes to unresolved.agents', () => {
  assert.deepStrictEqual(usesDemoBundle.unresolved.agents, ['ghost-agent']);
});

test('collect: an unresolvable bare skill ref goes to unresolved.skills', () => {
  assert.ok(usesDemoBundle.unresolved.skills.includes('demo-unknown'));
});

test('collect: a "/"-containing skill ref is never resolved — straight to unresolved.skills', () => {
  assert.ok(usesDemoBundle.unresolved.skills.includes('../shared/thing.md'));
  assert.ok(!usesDemoBundle.skills.some((s) => s.name === '../shared/thing.md'));
});

// --- 4. footprint: word-bounded regexes ---
test('footprint: flags a body mentioning "git" (word-bounded)', () => {
  const b = { agents: [{ name: 'a', content: 'Please run `git commit` when you are done.' }], skills: [], unresolved: { agents: [], skills: [] } };
  const lines = bundle.footprint(b).join('\n');
  assert.ok(/\bgit\b/i.test(lines), 'expected a git mention in the footprint output');
});

test('footprint: does NOT flag "digit"/"legit" as git', () => {
  const b = { agents: [{ name: 'a', content: 'Enter a 4-digit code and keep it legit.' }], skills: [], unresolved: { agents: [], skills: [] } };
  const lines = bundle.footprint(b).join('\n');
  assert.ok(!/\bgit\b/.test(lines), 'digit/legit falsely matched \\bgit\\b');
});

// --- 5. writeDir -> readDir round-trip ---
test('writeDir -> readDir round-trip: same yamlText + same agent/skill name sets', () => {
  const destDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mmt-bundle-rt-')), 'uses-demo');
  bundle.writeDir(usesDemoBundle, destDir);
  const back = bundle.readDir(destDir);
  assert.strictEqual(back.team.name, usesDemoBundle.team.name);
  assert.strictEqual(back.team.yamlText, usesDemoBundle.team.yamlText);
  assert.deepStrictEqual(back.agents.map((a) => a.name).sort(), usesDemoBundle.agents.map((a) => a.name).sort());
  assert.deepStrictEqual(back.skills.map((s) => s.name).sort(), usesDemoBundle.skills.map((s) => s.name).sort());
});

// --- 6. readDir errors ---
test('readDir: zero *.team.yaml throws "not a team bundle"', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmt-bundle-empty-'));
  assert.throws(() => bundle.readDir(dir), /not a team bundle/);
});

test('readDir: two *.team.yaml throws "ambiguous bundle"', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmt-bundle-ambiguous-'));
  fs.writeFileSync(path.join(dir, 'a.team.yaml'), 'team: a\nsteps: []\n');
  fs.writeFileSync(path.join(dir, 'b.team.yaml'), 'team: b\nsteps: []\n');
  assert.throws(() => bundle.readDir(dir), /ambiguous bundle/);
});

// --- 7. readDir on the real catalog fixture, unmodified ---
test('readDir: a real catalog directory imports unmodified', () => {
  const dir = path.join(REPO_ROOT, 'catalog', 'mamadoudicko', 'idea-to-spec');
  const b = bundle.readDir(dir);
  assert.strictEqual(b.team.name, 'idea-to-spec');
  assert.strictEqual(b.team.yamlText, fs.readFileSync(path.join(dir, 'idea-to-spec.team.yaml'), 'utf8'));
  assert.strictEqual(b.agents.length, 0);
  const sp = b.skills.find((s) => s.name === 'spec-publish');
  assert.ok(sp, 'spec-publish not read back from the catalog fixture');
  assert.strictEqual(sp.content, specPublishContent);
});

// --- 8. writeDir force gate ---
test('writeDir: refuses an existing destDir unless force', () => {
  const destDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmt-bundle-force-'));
  assert.throws(() => bundle.writeDir(usesDemoBundle, destDir), /already exists/);
  assert.doesNotThrow(() => bundle.writeDir(usesDemoBundle, destDir, { force: true }));
});

// --- 9. mmt import <dir> in a non-TTY: abort without --yes, install with --yes ---
test('CLI: mmt import <dir> in a non-TTY writes nothing and exits non-zero without --yes; installs with --yes', () => {
  const srcDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmt-bundle-cli-src-'));
  fs.rmdirSync(srcDir);
  bundle.writeDir({
    team: { name: 'cli-import-demo', yamlText: 'team: cli-import-demo\nabout: cli test fixture\nsteps:\n  - member: solo\n    does: a thing\n' },
    agents: [],
    skills: [{ name: 'cli-import-skill', content: '---\nname: cli-import-skill\ndescription: a cli test skill\n---\n\n# cli-import-skill\n\nBody.\n' }],
    unresolved: { agents: [], skills: [] },
  }, srcDir, { force: true });

  const cliHome = fs.mkdtempSync(path.join(os.tmpdir(), 'mmt-bundle-cli-home-'));
  const cliProject = fs.mkdtempSync(path.join(os.tmpdir(), 'mmt-bundle-cli-project-'));
  const env = { ...process.env, HOME: cliHome, USERPROFILE: cliHome };
  const bin = path.join(REPO_ROOT, 'bin', 'mmt');
  const teamFile = path.join(cliHome, '.my-mini-team', 'teams', 'cli-import-demo.team.yaml');
  const skillFile = path.join(cliHome, '.claude', 'skills', 'cli-import-skill', 'SKILL.md');

  const noYes = spawnSync(process.execPath, [bin, 'import', srcDir], { cwd: cliProject, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000 });
  assert.notStrictEqual(noYes.status, 0, 'expected a non-zero exit without --yes in a non-TTY');
  assert.ok(noYes.stdout.includes('cli-import-demo'), 'expected the manifest (team name) in stdout');
  assert.ok(!fs.existsSync(teamFile), 'team file must not be written without --yes');
  assert.ok(!fs.existsSync(skillFile), 'skill file must not be written without --yes');

  const withYes = spawnSync(process.execPath, [bin, 'import', srcDir, '--yes'], { cwd: cliProject, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000 });
  assert.strictEqual(withYes.status, 0, 'expected exit 0 with --yes: ' + withYes.stdout + withYes.stderr);
  assert.ok(fs.existsSync(teamFile), 'team file should be written with --yes');
  assert.ok(fs.existsSync(skillFile), 'skill file should be written with --yes');
});

process.env.HOME = REAL_HOME;
process.env.USERPROFILE = REAL_HOME;
process.stdout.write('\n' + passed + ' passed\n');
