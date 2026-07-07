'use strict';
// bin/mmt: verb-first CLI grammar (mmt <verb> <type> <name>).
//
// Two layers:
//  1. In-process unit tests for lib/agents.js `deleteAgent` and lib/skills.js
//     `deleteSkill` — sandboxes HOME like test/bundle.test.js.
//  2. Black-box CLI tests that spawn `node bin/mmt <args>` with a sandboxed
//     HOME (and cwd, so agents.js/skills.js's PROJECT source never sees the
//     real repo) and a PATH that excludes the real `claude` binary (so we
//     never accidentally shell out on a dev machine that has Claude Code
//     installed). Tests that need `compose.*` to succeed install a throwaway
//     `claude` shim on PATH that prints fixed output — this proves routing
//     and the name-honoring rewrite without ever hitting the network.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; process.stdout.write('  ✓ ' + name + '\n'); }
  catch (e) { process.stdout.write('  ✗ ' + name + '\n    ' + (e.stack || e.message).split('\n').slice(0, 6).join('\n    ') + '\n'); process.exitCode = 1; }
}

const REPO_ROOT = path.join(__dirname, '..');
const BIN = path.join(REPO_ROOT, 'bin', 'mmt');
const REAL_HOME = os.homedir();

// ---------------------------------------------------------------------------
// 1. In-process unit tests: lib/agents.js deleteAgent, lib/skills.js deleteSkill
// ---------------------------------------------------------------------------
(function unitTests() {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'mmt-cli-unit-home-'));
  process.env.HOME = tmpHome;
  process.env.USERPROFILE = tmpHome;

  const agents = require('../lib/agents');
  const skills = require('../lib/skills');

  function writeAgentFixture(name, content) {
    const dir = path.join(tmpHome, '.claude', 'agents');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name + '.md'), content);
  }
  function writeSkillDirFixture(name, content) {
    const dir = path.join(tmpHome, '.claude', 'skills', name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), content);
  }
  function writeSkillFlatFixture(name, content) {
    const dir = path.join(tmpHome, '.claude', 'skills');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name + '.md'), content);
  }

  test('deleteAgent: removes an existing flat agent and returns its path', () => {
    writeAgentFixture('unit-agent-a', '---\nname: unit-agent-a\ndescription: x\n---\n\n# unit-agent-a\n\nbody\n');
    const file = path.join(tmpHome, '.claude', 'agents', 'unit-agent-a.md');
    assert.ok(fs.existsSync(file));
    const removed = agents.deleteAgent('unit-agent-a');
    assert.deepStrictEqual(removed, [file]);
    assert.ok(!fs.existsSync(file), 'agent file should be gone');
  });

  test('deleteAgent: unknown agent returns an empty array', () => {
    assert.deepStrictEqual(agents.deleteAgent('no-such-agent-xyz'), []);
  });

  test('deleteSkill: dir-form removes the WHOLE directory, not just SKILL.md', () => {
    writeSkillDirFixture('unit-skill-dir', '---\nname: unit-skill-dir\ndescription: x\n---\n\n# unit-skill-dir\n\nbody\n');
    const dir = path.join(tmpHome, '.claude', 'skills', 'unit-skill-dir');
    assert.ok(fs.existsSync(path.join(dir, 'SKILL.md')));
    const removed = skills.deleteSkill('unit-skill-dir');
    assert.deepStrictEqual(removed, [dir]);
    assert.ok(!fs.existsSync(dir), 'the whole skill directory should be gone, not just SKILL.md');
  });

  test('deleteSkill: flat-form unlinks the .md file', () => {
    writeSkillFlatFixture('unit-skill-flat', '---\nname: unit-skill-flat\ndescription: x\n---\n\n# unit-skill-flat\n\nbody\n');
    const file = path.join(tmpHome, '.claude', 'skills', 'unit-skill-flat.md');
    assert.ok(fs.existsSync(file));
    const removed = skills.deleteSkill('unit-skill-flat');
    assert.deepStrictEqual(removed, [file]);
    assert.ok(!fs.existsSync(file));
  });

  test('deleteSkill: unknown skill returns an empty array', () => {
    assert.deepStrictEqual(skills.deleteSkill('no-such-skill-xyz'), []);
  });

  process.env.HOME = REAL_HOME;
  process.env.USERPROFILE = REAL_HOME;
})();

// ---------------------------------------------------------------------------
// 2. Black-box CLI tests
// ---------------------------------------------------------------------------

// A PATH with nothing on it — guarantees `claude` is never found, regardless
// of whether the dev machine running this test suite has it installed.
const EMPTY_PATH = fs.mkdtempSync(path.join(os.tmpdir(), 'mmt-cli-emptypath-'));

function sandbox() {
  return {
    home: fs.mkdtempSync(path.join(os.tmpdir(), 'mmt-cli-home-')),
    project: fs.mkdtempSync(path.join(os.tmpdir(), 'mmt-cli-project-')),
  };
}

function runCli(sb, argv, opts = {}) {
  const env = { ...process.env, HOME: sb.home, USERPROFILE: sb.home, PATH: opts.path || EMPTY_PATH };
  return spawnSync(process.execPath, [BIN, ...argv], {
    cwd: sb.project,
    env,
    encoding: 'utf8',
    input: opts.input !== undefined ? opts.input : '',
    timeout: opts.timeout || 15000,
  });
}

// A throwaway `claude` shim: writes a marker file when invoked, then prints
// `output` to stdout and exits 0. No network, no real Claude Code involved.
// `path` includes node's own directory too (the shebang needs `node` on PATH).
function fakeClaude(output) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmt-cli-fakeclaude-'));
  const marker = path.join(dir, 'called.marker');
  const script = `#!/usr/bin/env node
require('fs').writeFileSync(${JSON.stringify(marker)}, String(Date.now()));
process.stdout.write(${JSON.stringify(output)});
`;
  const file = path.join(dir, 'claude');
  fs.writeFileSync(file, script);
  fs.chmodSync(file, 0o755);
  const searchPath = dir + path.delimiter + path.dirname(process.execPath);
  return { dir, marker, path: searchPath };
}

function writeFixtureTeam(sb, name, yamlText) {
  const dir = path.join(sb.home, '.my-mini-team', 'teams');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name + '.team.yaml'), yamlText);
  return path.join(dir, name + '.team.yaml');
}
function writeFixtureAgent(sb, name, content) {
  const dir = path.join(sb.home, '.claude', 'agents');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name + '.md'), content);
  return path.join(dir, name + '.md');
}
function writeFixtureSkill(sb, name, content) {
  const dir = path.join(sb.home, '.claude', 'skills', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), content);
  return path.join(dir, 'SKILL.md');
}

const MIN_TEAM_YAML = (name) => `team: ${name}\nabout: fixture team\nsteps:\n  - member: solo\n    does: a thing\n`;

// --- bare mmt / help / list --------------------------------------------------

test('bare `mmt` prints help(), not the teams home', () => {
  const r = runCli(sandbox(), []);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(/grammar:/.test(r.stdout), 'expected the help() grammar line');
  assert.ok(!/my mini teams/.test(r.stdout), 'bare mmt should no longer print the teams home');
});

test('`mmt list teams` prints the teams home (what bare `mmt` used to print)', () => {
  const sb = sandbox();
  writeFixtureTeam(sb, 'list-demo', MIN_TEAM_YAML('list-demo'));
  const r = runCli(sb, ['list', 'teams']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(/my mini teams/.test(r.stdout));
  assert.ok(r.stdout.includes('list-demo'));
});

test('`mmt list` (no type) defaults to teams', () => {
  const r = runCli(sandbox(), ['list']);
  assert.ok(/my mini teams/.test(r.stdout));
});

test('`mmt list agents` calls agentsList()', () => {
  const r = runCli(sandbox(), ['list', 'agents']);
  assert.ok(/native subagents/.test(r.stdout));
});

test('`mmt list skills` calls skillsList()', () => {
  const r = runCli(sandbox(), ['list', 'skills']);
  assert.ok(/reusable capabilities/.test(r.stdout));
});

test('retained plural aliases: `mmt teams` / `mmt skills` / `mmt agents`', () => {
  const teams = runCli(sandbox(), ['teams']);
  assert.ok(/my mini teams/.test(teams.stdout));
  const sk = runCli(sandbox(), ['skills']);
  assert.ok(/reusable capabilities/.test(sk.stdout));
  const ag = runCli(sandbox(), ['agents']);
  assert.ok(/native subagents/.test(ag.stdout));
});

// --- removed / typeless forms -> usage error, no mutation -------------------

test('typeless `mmt show baz` is a usage error', () => {
  const r = runCli(sandbox(), ['show', 'baz']);
  assert.ok(/usage:/.test(r.stdout), r.stdout);
});

test('typeless `mmt edit baz "chg"` is a usage error', () => {
  const r = runCli(sandbox(), ['edit', 'baz', 'chg']);
  assert.ok(/usage:/.test(r.stdout), r.stdout);
});

test('typeless `mmt delete baz` is a usage error and does not delete the team', () => {
  const sb = sandbox();
  const file = writeFixtureTeam(sb, 'baz', MIN_TEAM_YAML('baz'));
  const r = runCli(sb, ['delete', 'baz']);
  assert.ok(/usage:/.test(r.stdout), r.stdout);
  assert.ok(fs.existsSync(file), 'typeless delete must not mutate anything');
});

test('bare `mmt new "just a description"` (no type keyword) is a usage error, never opens a session', () => {
  const sb = sandbox();
  const r = runCli(sb, ['new', 'just a description']);
  assert.ok(/usage:/.test(r.stdout), r.stdout);
  assert.ok(!/Opening a Claude Code session/.test(r.stdout));
  assert.ok(!fs.existsSync(path.join(sb.home, '.my-mini-team', 'teams')), 'no team dir should have been created');
});

test('noun-first `mmt team demo`, `mmt team new x`, `mmt skill new x`, `mmt agent new x` are all usage errors', () => {
  const sb = sandbox();
  for (const argv of [['team', 'demo'], ['team', 'new', 'x'], ['skill', 'new', 'x'], ['agent', 'new', 'x']]) {
    const r = runCli(sb, argv);
    assert.ok(/usage:/.test(r.stdout), 'expected a usage error for `mmt ' + argv.join(' ') + '`: ' + r.stdout);
  }
  assert.ok(!fs.existsSync(path.join(sb.home, '.my-mini-team', 'teams', 'x.team.yaml')));
  assert.ok(!fs.existsSync(path.join(sb.home, '.claude', 'skills', 'x')));
  assert.ok(!fs.existsSync(path.join(sb.home, '.claude', 'agents', 'x.md')));
});

test('bare `mmt demo` (a bare team name, both old shortcuts removed) is a usage error', () => {
  const r = runCli(sandbox(), ['demo']);
  assert.ok(/usage:/.test(r.stdout), r.stdout);
});

// --- run() ordering: --sim/--headless (no task) must never hit the pointer --

test('`mmt run <team>` with no task opens the interactive pointer, preserving --model', () => {
  const sb = sandbox();
  writeFixtureTeam(sb, 'run-demo', MIN_TEAM_YAML('run-demo'));
  const noModel = runCli(sb, ['run', 'run-demo']);
  assert.ok(noModel.stdout.includes('/mmt run run-demo'), noModel.stdout);
  const withModel = runCli(sb, ['run', 'run-demo', '--model', 'opus']);
  assert.ok(withModel.stdout.includes('/mmt run run-demo --model opus'), withModel.stdout);
});

test('`mmt run <team> "task" --model opus` preserves both the task and the model', () => {
  const sb = sandbox();
  writeFixtureTeam(sb, 'run-demo2', MIN_TEAM_YAML('run-demo2'));
  const r = runCli(sb, ['run', 'run-demo2', 'some task', '--model', 'opus']);
  assert.ok(r.stdout.includes('/mmt run run-demo2 "some task" --model opus'), r.stdout);
});

test('`mmt run <team> --sim` with no task runs the simulator, never the interactive pointer', () => {
  const sb = sandbox();
  writeFixtureTeam(sb, 'sim-demo', MIN_TEAM_YAML('sim-demo'));
  const r = runCli(sb, ['run', 'sim-demo', '--sim', '--fast']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(!/Opening a Claude Code session/.test(r.stdout), 'sim must not open an interactive session');
  assert.ok(/\(sim\)/.test(r.stdout), 'expected the simulator banner');
});

test('`mmt run <team> --headless` with no task hits the headless branch, never the interactive pointer', () => {
  const sb = sandbox();
  writeFixtureTeam(sb, 'headless-demo', MIN_TEAM_YAML('headless-demo'));
  const r = runCli(sb, ['run', 'headless-demo', '--headless'], { timeout: 20000 });
  assert.ok(!/Opening a Claude Code session/.test(r.stdout), 'headless must not open an interactive session');
  assert.ok(/--headless uses claude -p/.test(r.stdout), 'expected the headless warning banner');
});

test('`mmt run <nonexistent>` prints notFound and hints `mmt list teams`', () => {
  const r = runCli(sandbox(), ['run', 'ghost-team', 'a task']);
  assert.ok(/no team "ghost-team"/.test(r.stdout));
  assert.ok(/mmt list teams/.test(r.stdout));
});

// --- `mmt new team <name>` honors the CLI name on every headless code path --

test('`mmt new team <name> --headless` pins `team:` to <name>, overriding whatever the model proposed', () => {
  const sb = sandbox();
  const claude = fakeClaude('team: totally-wrong-name\nabout: fixture\nsteps:\n  - member: solo\n    does: a thing\n');
  const r = runCli(sb, ['new', 'team', 'demo', 'strategist plans then coder builds', '--headless'], { path: claude.path });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const file = path.join(sb.home, '.my-mini-team', 'teams', 'demo.team.yaml');
  assert.ok(fs.existsSync(file), 'expected demo.team.yaml, got: ' + fs.readdirSync(path.dirname(file)).join(','));
  const text = fs.readFileSync(file, 'utf8');
  assert.ok(/^team: demo$/m.test(text), 'team: field must be rewritten to the CLI name:\n' + text);
});

test('`mmt new team <name> --headless` with an empty description and non-TTY stdin prints "nothing to compose" and never calls compose', () => {
  const sb = sandbox();
  const claude = fakeClaude('team: should-never-be-used\nsteps: []\n');
  const r = runCli(sb, ['new', 'team', 'empty-demo', '--headless'], { path: claude.path });
  assert.ok(/nothing to compose/.test(r.stdout), r.stdout);
  assert.ok(!fs.existsSync(claude.marker), 'compose.compose (and therefore the claude shim) must never have been invoked');
  assert.ok(!fs.existsSync(path.join(sb.home, '.my-mini-team', 'teams', 'empty-demo.team.yaml')));
});

// --- new/edit/show/delete routing: skill vs agent vs team must never swap ---

const SKILL_OR_AGENT_FIXTURE =
  '---\nname: placeholder\ndescription: a demo capability\n---\n\n# placeholder\n\nDoes a demo thing.\n';

test('`mmt new skill <name> "<desc>"` routes to skillCmd(\'new\', ...) and creates a skill', () => {
  const sb = sandbox();
  const claude = fakeClaude(SKILL_OR_AGENT_FIXTURE);
  const r = runCli(sb, ['new', 'skill', 'foo', 'does a thing'], { path: claude.path });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const file = path.join(sb.home, '.claude', 'skills', 'foo', 'SKILL.md');
  assert.ok(fs.existsSync(file), r.stdout);
  assert.ok(/name: foo/.test(fs.readFileSync(file, 'utf8')));
  assert.ok(!fs.existsSync(path.join(sb.home, '.claude', 'agents', 'foo.md')), 'must not have been created as an agent');
});

test('`mmt new agent <name> "<role>"` routes to agentCmd(\'new\', ...) and creates an agent', () => {
  const sb = sandbox();
  const claude = fakeClaude(SKILL_OR_AGENT_FIXTURE);
  const r = runCli(sb, ['new', 'agent', 'bar', 'a role'], { path: claude.path });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const file = path.join(sb.home, '.claude', 'agents', 'bar.md');
  assert.ok(fs.existsSync(file), r.stdout);
  assert.ok(/name: bar/.test(fs.readFileSync(file, 'utf8')));
  assert.ok(!fs.existsSync(path.join(sb.home, '.claude', 'skills', 'bar')), 'must not have been created as a skill');
});

test('`mmt show team|agent|skill <name>` route to the right handler', () => {
  const sb = sandbox();
  writeFixtureTeam(sb, 'rtr-team', MIN_TEAM_YAML('rtr-team'));
  const agentFile = writeFixtureAgent(sb, 'rtr-agent', '---\nname: rtr-agent\ndescription: x\n---\n\n# rtr-agent\n\nAGENTBODYMARKER\n');
  const skillFile = writeFixtureSkill(sb, 'rtr-skill', '---\nname: rtr-skill\ndescription: x\n---\n\n# rtr-skill\n\nSKILLBODYMARKER\n');

  const team = runCli(sb, ['show', 'team', 'rtr-team']);
  assert.ok(/shape:/.test(team.stdout), 'team show() prints a shape: line\n' + team.stdout);

  const agent = runCli(sb, ['show', 'agent', 'rtr-agent']);
  assert.ok(agent.stdout.includes(agentFile), agent.stdout);
  assert.ok(agent.stdout.includes('AGENTBODYMARKER'));
  assert.ok(!/shape:/.test(agent.stdout));

  const skill = runCli(sb, ['show', 'skill', 'rtr-skill']);
  assert.ok(skill.stdout.includes(skillFile), skill.stdout);
  assert.ok(skill.stdout.includes('SKILLBODYMARKER'));
  assert.ok(!/shape:/.test(skill.stdout));
});

test('`mmt edit skill <name>` routes to skillCmd(\'edit\', ...), NOT editCmd (team-only)', () => {
  const sb = sandbox();
  writeFixtureSkill(sb, 'edit-skill-demo', '---\nname: edit-skill-demo\ndescription: x\n---\n\n# edit-skill-demo\n\nbody\n');
  const r = runCli(sb, ['edit', 'skill', 'edit-skill-demo']);
  // non-TTY, no instruction -> skillCmd prints "nothing to change."; editCmd
  // would instead have looked up a TEAM named edit-skill-demo and failed with
  // "no team ..." — assert we got the skill-side message, not the team-side one.
  assert.ok(/nothing to change/.test(r.stdout), r.stdout);
  assert.ok(!/no team/.test(r.stdout));
});

test('`mmt edit agent <name>` routes to agentCmd(\'edit\', ...)', () => {
  const sb = sandbox();
  writeFixtureAgent(sb, 'edit-agent-demo', '---\nname: edit-agent-demo\ndescription: x\n---\n\n# edit-agent-demo\n\nbody\n');
  const r = runCli(sb, ['edit', 'agent', 'edit-agent-demo']);
  assert.ok(/nothing to change/.test(r.stdout), r.stdout);
  assert.ok(!/no team/.test(r.stdout));
});

// --- delete agent/skill (net-new) -------------------------------------------

test('`mmt delete agent <name>` removes the agent file and reports it', () => {
  const sb = sandbox();
  const file = writeFixtureAgent(sb, 'del-agent-demo', '---\nname: del-agent-demo\ndescription: x\n---\n\n# del-agent-demo\n\nbody\n');
  const r = runCli(sb, ['delete', 'agent', 'del-agent-demo']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.ok(/deleted/.test(r.stdout));
  assert.ok(!fs.existsSync(file));
});

test('`mmt delete agent <missing>` prints a not-found message and exits 0', () => {
  const r = runCli(sandbox(), ['delete', 'agent', 'no-such-agent']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.ok(/no agent "no-such-agent"/.test(r.stdout), r.stdout);
});

test('`mmt delete skill <name>` on a dir-form skill removes the WHOLE directory', () => {
  const sb = sandbox();
  writeFixtureSkill(sb, 'del-skill-dir', '---\nname: del-skill-dir\ndescription: x\n---\n\n# del-skill-dir\n\nbody\n');
  const dir = path.join(sb.home, '.claude', 'skills', 'del-skill-dir');
  const r = runCli(sb, ['delete', 'skill', 'del-skill-dir']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.ok(!fs.existsSync(dir), 'the whole skill directory should be gone');
});

test('`mmt delete skill <name>` on a flat-form skill unlinks the .md file', () => {
  const sb = sandbox();
  const dir = path.join(sb.home, '.claude', 'skills');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'del-skill-flat.md');
  fs.writeFileSync(file, '---\nname: del-skill-flat\ndescription: x\n---\n\n# del-skill-flat\n\nbody\n');
  const r = runCli(sb, ['delete', 'skill', 'del-skill-flat']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.ok(!fs.existsSync(file));
});

// --- --ui is a no-op (never crashes) on show/delete/list/run ---------------

test('--ui on show/delete/list/run is ignored, no crash', () => {
  const sb = sandbox();
  writeFixtureTeam(sb, 'ui-noop', MIN_TEAM_YAML('ui-noop'));
  for (const argv of [
    ['show', 'team', 'ui-noop', '--ui'],
    ['delete', 'agent', 'no-such-agent', '--ui'],
    ['list', '--ui'],
    ['run', 'ui-noop', '--sim', '--fast', '--ui'],
  ]) {
    const r = runCli(sb, argv);
    assert.strictEqual(r.status, 0, '`mmt ' + argv.join(' ') + '` crashed:\n' + r.stdout + r.stderr);
  }
});

process.stdout.write('\n' + passed + ' passed\n');
