// Interactive team editor (Ink). ESM + React.createElement (no JSX → no build
// step). Sits on top of the pure reducer (lib/editor.js), the resolver
// (lib/lineup.js), and the modal logic (lib/editor-forms.js). Two focused views
// — the step list and the per-step editor — so only one owns keyboard input.
import React, { useState } from 'react';
import { render, Box, Text, useApp, useInput } from 'ink';
import editor from './editor.js';
import lineup from './lineup.js';
import agentsLib from './agents.js';
import skillsLib from './skills.js';
import forms from './editor-forms.js';
import model from './model.js';

const h = React.createElement;

function flatten(steps) {
  const rows = [];
  steps.forEach((n, i) => {
    if (n.type === 'loop') {
      rows.push({ path: [i], kind: 'loop', node: n });
      n.steps.forEach((m, j) => rows.push({ path: [i, j], kind: 'inner', node: m }));
    } else {
      rows.push({ path: [i], kind: 'member', node: n });
    }
  });
  return rows;
}

const chipsOf = (node) => {
  const sk = node && node.skills;
  return (!sk || !sk.length) ? '' : '  ' + sk.map((s) => '·' + s).join(' ');
};

function Row({ row, rrow, selected }) {
  const n = row.node;
  const marker = selected ? '❯ ' : '  ';
  if (row.kind === 'loop') {
    return h(Text, { color: 'magenta' }, marker + '┌ loop · until ' + (n.until || '') + ' · max ' + (n.max_rounds || 3));
  }
  const indent = row.kind === 'inner' ? '  │ ' : '';
  const name = n.uses || n.member || 'member';
  const model = n.model ? '  (' + n.model + ')' : '';
  const does = n.does ? '  — ' + n.does : '';
  return h(Text, { color: selected ? 'cyan' : undefined, bold: selected },
    marker + indent + name + chipsOf(rrow ? rrow.node : n) + model + does);
}

// ---- the step list view (owns input while not editing a step) ----
function ListView({ steps, setSteps, name, onEdit, onExit }) {
  const [cursor, setCursor] = useState(0);
  const rows = flatten(steps);
  const idx = Math.min(cursor, Math.max(0, rows.length - 1));
  const cur = rows[idx];
  let rrows;
  try { rrows = flatten(lineup.effectiveSteps({ team: name, steps }).steps); } catch (e) { rrows = rows; }

  useInput((input, key) => {
    if (input === 'q') return onExit(null);
    if (input === 's') return onExit(steps);
    if (key.upArrow) return setCursor((c) => Math.max(0, c - 1));
    if (key.downArrow) return setCursor((c) => Math.min(rows.length - 1, c + 1));
    if (!cur) return;
    const [i, j] = cur.path;
    if (key.return && cur.kind !== 'loop') return onEdit(cur.path);
    if (input === 'k') return setSteps(editor.move(steps, cur.path, -1));
    if (input === 'j') return setSteps(editor.move(steps, cur.path, +1));
    if (input === 'd') {
      const ns = editor.removeAt(steps, cur.path);
      setSteps(ns); setCursor((c) => Math.max(0, Math.min(c, flatten(ns).length - 1)));
      return;
    }
    if (input === 'a') return setSteps(editor.addStep(steps, i + 1, editor.member({ does: 'new step' })));
    if (input === 'l') {
      if (j == null && steps[i] && steps[i].type === 'member' && steps[i + 1] && steps[i + 1].type === 'member') {
        try { setSteps(editor.wrapInLoop(steps, i, i + 1, {})); } catch (e) {}
      }
      return;
    }
    if (input === 'u') { if (j == null && steps[i] && steps[i].type === 'loop') setSteps(editor.unwrap(steps, i)); return; }
  });

  return h(Box, { flexDirection: 'column' },
    h(Text, null, '  editing ' + name),
    h(Box, { flexDirection: 'column', marginTop: 1 }, ...rows.map((row, k) => h(Row, { key: k, row, rrow: rrows[k], selected: k === idx }))),
    h(Text, { color: 'gray' }, '\n  ↑↓ move · ⏎ edit step · j/k reorder · a add · l loop · u unwrap · d delete · s save · q quit'));
}

// ---- the per-step editor (owns input while open) ----
export function StepEditor({ step, agentList, skillNames, onSave, onCancel }) {
  const agentNames = agentList.map((a) => a.name);
  const defaultsFor = (nm) => { const a = agentList.find((x) => x.name === nm); return a ? (a.skills || []) : []; };
  const startName = step.uses || step.member || agentNames[0] || '';
  // Keep the step's original name selectable even if it isn't a library agent,
  // so opening + saving an inline member: (or unresolved ref) never silently
  // reassigns it to the first agent.
  const pickable = (startName && !agentNames.includes(startName)) ? [startName, ...agentNames] : agentNames;
  const startDefaults = defaultsFor(startName);
  const startDesired = (() => {
    try { return model.mergeSkills(startDefaults, step.skills); } catch (e) { return startDefaults.slice(); }
  })();

  const [agentIdx, setAgentIdx] = useState(Math.max(0, pickable.indexOf(startName)));
  const [does, setDoes] = useState(step.does || '');
  const [doesCur, setDoesCur] = useState((step.does || '').length);
  const [desired, setDesired] = useState(startDesired);
  const [idx, setIdx] = useState(0); // 0=agent · 1=does · 2..=skills

  const agentName = pickable[Math.min(agentIdx, Math.max(0, pickable.length - 1))] || startName;
  const defaults = defaultsFor(agentName);
  const allSkills = [...new Set([...defaults, ...skillNames])];
  const total = 2 + allSkills.length;

  // Only emit `uses:` when the picked name resolves to a real agent; otherwise
  // keep it an inline member: (uses null) so an inline one-off isn't flipped.
  const known = agentNames.includes(agentName);
  const save = () => onSave({
    uses: known ? agentName : null,
    member: agentName,
    does,
    skills: forms.deriveSkillOverride(defaults, desired),
  });

  useInput((input, key) => {
    if (key.escape) return onCancel();
    if (key.return) return save();
    if (key.upArrow) return setIdx((i) => Math.max(0, i - 1));
    if (key.downArrow) return setIdx((i) => Math.min(total - 1, i + 1));
    if (idx === 0) { // agent row: ←→ cycles the agent
      if (key.rightArrow) return setAgentIdx((i) => (i + 1) % pickable.length);
      if (key.leftArrow) return setAgentIdx((i) => (i - 1 + pickable.length) % pickable.length);
      return;
    }
    if (idx === 1) { const r = forms.editText(does, doesCur, input, key); setDoes(r.text); setDoesCur(r.cur); return; } // does text
    if (input === ' ') { const name = allSkills[idx - 2]; if (name) setDesired((d) => forms.toggleSkill(d, name)); } // skill toggle
  });

  const row = (i, content) => h(Text, { color: idx === i ? 'cyan' : undefined, bold: idx === i }, (idx === i ? '❯ ' : '  ') + content);
  return h(Box, { flexDirection: 'column' },
    h(Text, null, '  edit step'),
    h(Box, { flexDirection: 'column', marginTop: 1 },
      row(0, 'agent  ' + agentName + (known ? '' : '  (inline)') + (idx === 0 ? '   (←→ change)' : '')),
      row(1, 'does   ' + (idx === 1 ? does.slice(0, doesCur) + '▏' + does.slice(doesCur) : (does || ''))),
      h(Text, { color: 'gray' }, '  skills'),
      ...allSkills.map((name, k) => {
        const i = 2 + k, checked = desired.includes(name), isDefault = defaults.includes(name);
        return h(Text, { key: name, color: idx === i ? 'cyan' : undefined, bold: idx === i },
          '    ' + (idx === i ? '❯ ' : '  ') + '[' + (checked ? 'x' : ' ') + '] ' + name + (isDefault ? '   (default)' : ''));
      })),
    h(Text, { color: 'gray' }, '\n  ↑↓ move · ←→ change agent · space toggle · type to edit does · ⏎ save · esc cancel'));
}

export function Editor({ initial, name, agentList, skillNames, onDone }) {
  const { exit } = useApp();
  const [steps, setSteps] = useState(initial);
  const [editing, setEditing] = useState(null);
  const finish = (r) => { onDone(r); exit(); };

  if (editing) {
    const step = editor.stepAt(steps, editing) || editor.member();
    return h(StepEditor, {
      step, agentList, skillNames,
      onSave: (patch) => { setSteps(editor.update(steps, editing, patch)); setEditing(null); },
      onCancel: () => setEditing(null),
    });
  }
  return h(ListView, { steps, setSteps, name, onEdit: setEditing, onExit: finish });
}

// ---- the agent editor (description · model · default-skill checkboxes) ----
const MODELS = ['', 'opus', 'sonnet', 'haiku'];

export function AgentEditor({ agent, skillNames, onSave, onCancel }) {
  const [description, setDescription] = useState(agent.description || '');
  const [descCur, setDescCur] = useState((agent.description || '').length);
  const [model, setModel] = useState(agent.model || '');
  const [desired, setDesired] = useState((agent.skills || []).slice());
  const [idx, setIdx] = useState(0); // 0=description · 1=model · 2..=skills

  const allSkills = [...new Set([...(agent.skills || []), ...skillNames])];
  const total = 2 + allSkills.length;
  const save = () => onSave({ description, model, skills: desired });

  useInput((input, key) => {
    if (key.escape) return onCancel();
    if (key.return) return save();
    if (key.upArrow) return setIdx((i) => Math.max(0, i - 1));
    if (key.downArrow) return setIdx((i) => Math.min(total - 1, i + 1));
    if (idx === 0) { const r = forms.editText(description, descCur, input, key); setDescription(r.text); setDescCur(r.cur); return; } // ←→ move cursor, type inserts
    if (idx === 1) { // model row: space / ←→ cycles (a non-standard value stays in the cycle)
      const cycle = MODELS.includes(model) ? MODELS : [model, ...MODELS];
      const j = cycle.indexOf(model);
      if (input === ' ' || key.rightArrow) return setModel(cycle[(j + 1) % cycle.length]);
      if (key.leftArrow) return setModel(cycle[(j - 1 + cycle.length) % cycle.length]);
      return;
    }
    if (input === ' ') { const name = allSkills[idx - 2]; if (name) setDesired((d) => forms.toggleSkill(d, name)); } // skill row
  });

  const row = (i, content) => h(Text, { color: idx === i ? 'cyan' : undefined, bold: idx === i }, (idx === i ? '❯ ' : '  ') + content);
  return h(Box, { flexDirection: 'column' },
    h(Text, null, '  edit agent ', h(Text, { color: 'cyan' }, agent.name)),
    h(Box, { flexDirection: 'column', marginTop: 1 },
      row(0, 'description  ' + (idx === 0 ? description.slice(0, descCur) + '▏' + description.slice(descCur) : (description || ''))),
      row(1, 'model        ' + (model || 'inherit') + (idx === 1 ? '   (space / ←→ to change)' : '')),
      h(Text, { color: 'gray' }, '  skills'),
      ...allSkills.map((name, k) => {
        const i = 2 + k, checked = desired.includes(name);
        return h(Text, { key: name, color: idx === i ? 'cyan' : undefined, bold: idx === i },
          '    ' + (idx === i ? '❯ ' : '  ') + '[' + (checked ? 'x' : ' ') + '] ' + name);
      })),
    h(Text, { color: 'gray' }, '\n  ↑↓ move · space toggle/change · type to edit description · ⏎ save · esc cancel'));
}

export function AgentApp({ agent, skillNames, onDone }) {
  const { exit } = useApp();
  const finish = (r) => { onDone(r); exit(); };
  return h(AgentEditor, { agent, skillNames, onSave: (p) => finish(p), onCancel: () => finish(null) });
}

// The editor needs a raw-capable interactive TTY for keyboard input. Some
// terminals (notably Warp) don't provide one to child processes, which makes
// Ink render but capture no keys — fail loudly instead of hanging silently.
function ensureTTY() {
  if (process.stdin.isTTY && process.stdout.isTTY && typeof process.stdin.setRawMode === 'function') return true;
  process.stderr.write('\n  the visual editor needs an interactive terminal with keyboard capture.\n'
    + '  this terminal did not provide one (stdin.isTTY=' + process.stdin.isTTY + ', rawMode='
    + (typeof process.stdin.setRawMode === 'function') + ').\n'
    + '  try a standard terminal (iTerm2 / Terminal.app); some terminals (e.g. Warp) intercept keys.\n\n');
  return false;
}

// Launch the agent editor on a resolved agent. Resolves to a patch
// { description, model, skills } or null if cancelled.
export function launchAgentEditor(agent) {
  if (!ensureTTY()) return Promise.resolve(null);
  const skillNames = skillsLib.list().map((s) => s.name);
  return new Promise((resolve) => {
    let settled = false;
    const done = (r) => { if (!settled) { settled = true; resolve(r); } };
    const app = render(h(AgentApp, { agent, skillNames, onDone: done }));
    app.waitUntilExit().then(() => done(null));
  });
}

// Launch the editor on a normalized team. Resolves to the edited `steps` array,
// or null if the user quit without saving.
export function launchEditor(team) {
  if (!ensureTTY()) return Promise.resolve(null);
  const agentList = agentsLib.list();
  const skillNames = skillsLib.list().map((s) => s.name);
  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => { if (!settled) { settled = true; resolve(result); } };
    const app = render(h(Editor, { initial: team.steps || [], name: team.team || 'team', agentList, skillNames, onDone: done }));
    app.waitUntilExit().then(() => done(null));
  });
}
