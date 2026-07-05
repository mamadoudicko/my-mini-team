#!/usr/bin/env node
'use strict';
// Bootstrap the mmt runtime after `npm i -g @mamadoudicko/mmt` (or npx), so a
// fresh install behaves exactly like a cloned repo:
//   - installs the `/mmt` slash command into ~/.claude/commands/ (the runtime
//     that `mmt run/new/edit` drives inside an interactive Claude Code session),
//   - seeds the starter skills into ~/.my-mini-team/skills/,
//   - seeds the starter teams into ~/.my-mini-team/teams/.
//
// Safe by design: never throws out (a failing postinstall must not break the
// install), idempotent, and it NEVER clobbers a user's own edited skills/teams
// (it only writes files that are missing; the `/mmt` command it keeps in sync).
// Opt out with MMT_NO_POSTINSTALL=1.

const fs = require('fs');
const os = require('os');
const path = require('path');

function main() {
  if (process.env.MMT_NO_POSTINSTALL) return;
  const home = os.homedir && os.homedir();
  if (!home || home === '/' || !fs.existsSync(home)) return; // no sane HOME — skip quietly

  const pkg = path.join(__dirname, '..');
  const done = [];

  // 1. /mmt slash command — keep it in sync (this file is owned by mmt).
  try {
    const src = path.join(pkg, '.claude', 'commands', 'mmt.md');
    if (fs.existsSync(src)) {
      const dstDir = path.join(home, '.claude', 'commands');
      const dst = path.join(dstDir, 'mmt.md');
      const next = fs.readFileSync(src, 'utf8');
      const cur = fs.existsSync(dst) ? fs.readFileSync(dst, 'utf8') : null;
      if (cur !== next) {
        fs.mkdirSync(dstDir, { recursive: true });
        fs.writeFileSync(dst, next);
        done.push(cur === null ? 'installed /mmt command' : 'updated /mmt command');
      }
    }
  } catch (_) { /* ignore */ }

  // 2. starter skills — seed only what's missing (never overwrite user edits).
  try {
    const srcDir = path.join(pkg, 'skills');
    if (fs.existsSync(srcDir)) {
      const dstBase = path.join(home, '.my-mini-team', 'skills');
      let n = 0;
      for (const name of fs.readdirSync(srcDir)) {
        const s = path.join(srcDir, name, 'SKILL.md');
        const d = path.join(dstBase, name, 'SKILL.md');
        if (fs.existsSync(s) && !fs.existsSync(d)) {
          fs.mkdirSync(path.dirname(d), { recursive: true });
          fs.copyFileSync(s, d);
          n++;
        }
      }
      if (n) done.push(`seeded ${n} skill${n === 1 ? '' : 's'}`);
    }
  } catch (_) { /* ignore */ }

  // 3. starter teams — seed only what's missing.
  try {
    const srcDir = path.join(pkg, 'teams');
    if (fs.existsSync(srcDir)) {
      const dstBase = path.join(home, '.my-mini-team', 'teams');
      let n = 0;
      for (const f of fs.readdirSync(srcDir)) {
        if (!f.endsWith('.team.yaml')) continue;
        const d = path.join(dstBase, f);
        if (!fs.existsSync(d)) {
          fs.mkdirSync(dstBase, { recursive: true });
          fs.copyFileSync(path.join(srcDir, f), d);
          n++;
        }
      }
      if (n) done.push(`seeded ${n} team${n === 1 ? '' : 's'}`);
    }
  } catch (_) { /* ignore */ }

  if (done.length) {
    process.stdout.write('\nmmt: ' + done.join(', ') + '.\n' +
      'Run `mmt` to see your teams, or `mmt run <team> "<task>"`.\n');
  }
}

try { main(); } catch (_) { /* never fail the install */ }
