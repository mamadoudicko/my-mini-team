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
function StepEditor({ step, agentList, skillNames, onSave, onCancel }) {
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

  const [field, setField] = useState('agent'); // agent | does | skills
  const [filter, setFilter] = useState('');
  const [agentIdx, setAgentIdx] = useState(Math.max(0, pickable.indexOf(startName)));
  const [does, setDoes] = useState(step.does || '');
  const [desired, setDesired] = useState(startDesired);
  const [skillIdx, setSkillIdx] = useState(0);

  const filtered = forms.filterList(pickable, filter);
  const agentName = filtered[Math.min(agentIdx, Math.max(0, filtered.length - 1))] || startName;
  const defaults = defaultsFor(agentName);
  const rows = forms.skillRows(defaults, desired, skillNames);

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
    if (key.tab) return setField((f) => (f === 'agent' ? 'does' : f === 'does' ? 'skills' : 'agent'));
    if (field === 'agent') {
      if (key.upArrow) return setAgentIdx((i) => Math.max(0, i - 1));
      if (key.downArrow) return setAgentIdx((i) => Math.min(filtered.length - 1, i + 1));
      if (key.backspace || key.delete) { setFilter((s) => s.slice(0, -1)); setAgentIdx(0); return; }
      if (input && input.length === 1 && input >= ' ' && !key.ctrl) { setFilter((s) => s + input); setAgentIdx(0); return; }
      return;
    }
    if (field === 'does') return setDoes((b) => forms.applyChar(b, input, key));
    if (field === 'skills') {
      if (key.upArrow) return setSkillIdx((i) => Math.max(0, i - 1));
      if (key.downArrow) return setSkillIdx((i) => Math.min(rows.length - 1, i + 1));
      if (input === ' ') { const r = rows[skillIdx]; if (r) setDesired((d) => forms.toggleSkill(d, r.name)); return; }
    }
  });

  const label = (f, t) => h(Text, { color: field === f ? 'cyan' : 'gray', bold: field === f }, t);

  const agentLine = field === 'agent'
    ? h(Box, { flexDirection: 'column' },
        h(Text, { color: 'cyan', bold: true }, '  agent    ' + (filter ? 'filter: ' + filter : '(type to filter)')),
        ...filtered.slice(0, 6).map((nm) =>
          h(Text, { key: nm, color: nm === agentName ? 'cyan' : undefined },
            '      ' + (nm === agentName ? '❯ ' : '  ') + nm)))
    : h(Text, null, '  ', label('agent', 'agent   '), agentName);

  const doesLine = h(Text, null, '  ', label('does', 'does    '),
    field === 'does' ? h(Text, { color: 'cyan' }, (does || '') + '▏') : h(Text, null, does || ' '));

  const skillsBlock = h(Box, { flexDirection: 'column' },
    h(Text, null, '  ', label('skills', 'skills')),
    ...rows.map((r, k) => h(Text, { key: r.name, color: field === 'skills' && k === skillIdx ? 'cyan' : undefined },
      '      ' + (field === 'skills' && k === skillIdx ? '❯ ' : '  ') + '[' + (r.checked ? 'x' : ' ') + '] ' + r.name +
      (r.isDefault ? '   (default)' : r.isAdded ? '   (+added)' : ''))));

  return h(Box, { flexDirection: 'column' },
    h(Text, null, '  edit step'),
    h(Box, { flexDirection: 'column', marginTop: 1 }, agentLine, doesLine, skillsBlock),
    h(Text, { color: 'gray' }, '\n  tab next field · ↑↓ move · space toggle · ⏎ save · esc cancel'));
}

function Editor({ initial, name, agentList, skillNames, onDone }) {
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

// Launch the editor on a normalized team. Resolves to the edited `steps` array,
// or null if the user quit without saving.
export function launchEditor(team) {
  const agentList = agentsLib.list();
  const skillNames = skillsLib.list().map((s) => s.name);
  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => { if (!settled) { settled = true; resolve(result); } };
    const app = render(h(Editor, { initial: team.steps || [], name: team.team || 'team', agentList, skillNames, onDone: done }));
    app.waitUntilExit().then(() => done(null));
  });
}
