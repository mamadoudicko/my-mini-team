// Interactive team editor (Ink). ESM + React.createElement (no JSX → no build
// step). Sits on top of the pure reducer (lib/editor.js) and the resolver
// (lib/lineup.js). Launched from bin/mmt via dynamic import when deps exist.
//
// Keys: ↑/↓ navigate · j/k move step down/up · a add member after · d delete ·
//       l wrap this + next into a loop · u unwrap loop · s save · q quit.
import React, { useState } from 'react';
import { render, Box, Text, useApp, useInput } from 'ink';
import editor from './editor.js';
import lineup from './lineup.js';

const h = React.createElement;

// Flatten the step tree into navigable rows (loop head + its inner members).
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

function chipsOf(node) {
  const sk = node && node.skills;
  if (!sk || !sk.length) return '';
  return '  ' + sk.map((s) => '·' + s).join(' ');
}

function Row({ row, rrow, selected }) {
  const n = row.node;
  const marker = selected ? '❯ ' : '  ';
  if (row.kind === 'loop') {
    return h(Text, { color: 'magenta' },
      marker + '┌ loop · until ' + (n.until || '') + ' · max ' + (n.max_rounds || 3));
  }
  const indent = row.kind === 'inner' ? '  │ ' : '';
  const name = (n.uses || n.member || 'member');
  const chips = chipsOf(rrow ? rrow.node : n);
  const model = n.model ? '  (' + n.model + ')' : '';
  const does = n.does ? '  — ' + n.does : '';
  return h(Text, { color: selected ? 'cyan' : undefined, bold: selected },
    marker + indent + name + chips + model + does);
}

function Editor({ initial, name, onDone }) {
  const { exit } = useApp();
  const [steps, setSteps] = useState(initial);
  const [cursor, setCursor] = useState(0);

  const rows = flatten(steps);
  const idx = Math.min(cursor, Math.max(0, rows.length - 1));
  const cur = rows[idx];
  let rrows;
  try { rrows = flatten(lineup.effectiveSteps({ team: name, steps }).steps); }
  catch (e) { rrows = rows; }

  const finish = (result) => { onDone(result); exit(); };

  useInput((input, key) => {
    if (input === 'q') return finish(null);
    if (input === 's') return finish(steps);
    if (key.upArrow) return setCursor((c) => Math.max(0, c - 1));
    if (key.downArrow) return setCursor((c) => Math.min(rows.length - 1, c + 1));
    if (!cur) return;
    const [i, j] = cur.path;
    if (input === 'k') return setSteps(editor.move(steps, cur.path, -1));
    if (input === 'j') return setSteps(editor.move(steps, cur.path, +1));
    if (input === 'd') {
      const ns = editor.removeAt(steps, cur.path);
      setSteps(ns);
      setCursor((c) => Math.max(0, Math.min(c, flatten(ns).length - 1)));
      return;
    }
    if (input === 'a') {
      // add a blank member after the current TOP-LEVEL step
      const at = (j == null ? i : i) + 1;
      setSteps(editor.addStep(steps, at, editor.member({ does: 'new step' })));
      return;
    }
    if (input === 'l') {
      // wrap this top-level member + the next into a loop
      if (j == null && steps[i] && steps[i].type === 'member' &&
          steps[i + 1] && steps[i + 1].type === 'member') {
        try { setSteps(editor.wrapInLoop(steps, i, i + 1, {})); } catch (e) {}
      }
      return;
    }
    if (input === 'u') {
      if (j == null && steps[i] && steps[i].type === 'loop') setSteps(editor.unwrap(steps, i));
      return;
    }
  });

  const header = h(Text, null, '  ' + 'editing ' + name);
  const body = rows.map((row, k) =>
    h(Row, { key: k, row, rrow: rrows[k], selected: k === idx }));
  const help = h(Text, { color: 'gray' },
    '\n  ↑↓ move cursor · j/k reorder · a add · l loop · u unwrap · d delete · s save · q quit');

  return h(Box, { flexDirection: 'column' }, header, h(Box, { flexDirection: 'column', marginTop: 1 }, ...body), help);
}

// Launch the editor on a normalized team. Resolves to the edited `steps` array,
// or null if the user quit without saving.
export function launchEditor(team) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => { if (!settled) { settled = true; resolve(result); } };
    const app = render(h(Editor, { initial: team.steps || [], name: team.team || 'team', onDone: done }));
    app.waitUntilExit().then(() => done(null));
  });
}
