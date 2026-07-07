// Repro test: does the AgentEditor / StepEditor actually capture keyboard input?
// Uses ink-testing-library (no real TTY needed). Run: node test/editor-ui.test.mjs
import React from 'react';
import { render } from 'ink-testing-library';
import { AgentEditor, StepEditor, AgentApp, Editor } from '../lib/team-editor.mjs';

const h = React.createElement;
const tick = () => new Promise((r) => setTimeout(r, 30));
let passed = 0, failed = 0;
const ok = (name, cond) => { if (cond) { passed++; process.stdout.write('  ✓ ' + name + '\n'); } else { failed++; process.stdout.write('  ✗ ' + name + '\n'); } };

// --- AgentEditor: tab should move focus desc → model → skills ---
{
  const agent = { name: 'reviewer', description: 'Reviews diffs', model: 'sonnet', skills: ['github-comment'], body: 'Review the diff.' };
  const { stdin, lastFrame, unmount } = render(h(AgentEditor, {
    agent, skillNames: ['github-comment', 'run-tests', 'github-pr'], onSave: () => {}, onCancel: () => {},
  }));
  await tick();
  const before = lastFrame();
  stdin.write('\t');                 // tab → focus should move to "model"
  await tick();
  const after = lastFrame();
  ok('AgentEditor renders', /description/.test(before) && /skills/.test(before));
  ok('AgentEditor useInput fires (tab moves focus)', before !== after);

  // type in description (focus back to desc first: two more tabs → desc)
  stdin.write('\t'); await tick(); stdin.write('\t'); await tick(); // model→skills→desc
  const beforeType = lastFrame();
  stdin.write('X'); await tick();
  ok('AgentEditor description accepts typing', lastFrame() !== beforeType);
  unmount();
}

// --- StepEditor: tab should move focus agent → does ---
{
  const agentList = [{ name: 'coder', skills: ['github-pr'] }, { name: 'reviewer', skills: ['github-comment'] }];
  const step = { type: 'member', uses: 'coder', member: 'coder', does: 'build', skills: null, model: '' };
  const { stdin, lastFrame, unmount } = render(h(StepEditor, {
    step, agentList, skillNames: ['github-pr', 'run-tests'], onSave: () => {}, onCancel: () => {},
  }));
  await tick();
  const before = lastFrame();
  stdin.write('\t'); await tick();
  ok('StepEditor renders', /agent/.test(before));
  ok('StepEditor useInput fires (tab moves focus)', before !== lastFrame());
  unmount();
}

// --- AgentApp wrapper (the real launched component) ---
{
  const agent = { name: 'reviewer', description: 'Adversarially reviews a diff for correctness bugs and real blockers', model: 'sonnet', skills: ['github-comment'], body: 'Review the diff.' };
  const { stdin, lastFrame, unmount } = render(h(AgentApp, {
    agent, skillNames: ['github-comment', 'run-tests', 'github-pr', 'exgram', 'github-post', 'pr-list', 'publish-report', 'ticket-status'], onDone: () => {},
  }));
  await tick();
  const before = lastFrame();
  stdin.write('\t'); await tick();
  ok('AgentApp (real wrapper) useInput fires', before !== lastFrame());
  unmount();
}

// --- Editor wrapper (the working team component) for comparison ---
{
  const agentList = [{ name: 'coder', skills: ['github-pr'] }];
  const team = { team: 't', steps: [{ type: 'member', uses: 'coder', member: 'coder', does: 'build', skills: null, model: '' }, { type: 'member', uses: 'coder', member: 'coder', does: 'fix', skills: null, model: '' }] };
  const { stdin, lastFrame, unmount } = render(h(Editor, {
    initial: team.steps, name: team.team, agentList, skillNames: ['github-pr'], onDone: () => {},
  }));
  await tick();
  const before = lastFrame();
  stdin.write('[B'); await tick();   // down arrow → cursor moves
  ok('Editor (team wrapper) useInput fires', before !== lastFrame());
  unmount();
}

process.stdout.write('\n' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed ? 1 : 0);
