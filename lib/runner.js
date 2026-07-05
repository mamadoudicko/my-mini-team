'use strict';
const { C, SYM, SPIN, sleep, Painter, isTTY } = require('./ui');

// Build a linear execution plan from the workflow, expanding loops into rounds.
// Simulation for UX testing: fakes realistic per-skill actions, a converging
// review loop, and one human-approval gate (so the "waiting for you" state shows).
function buildPlan(team) {
  const acts = [];
  const walk = (steps) => {
    for (const n of steps) {
      if (n.type === 'loop') {
        const rounds = Math.max(1, Math.min(2, n.max_rounds || 2));
        for (let r = 1; r <= rounds; r++) {
          const last = r === rounds;
          if (last) acts.push(act(n.steps[0], { loop: n, round: r, approve: true }));
          else for (const s of n.steps) acts.push(act(s, { loop: n, round: r }));
        }
      } else {
        acts.push(act(n, {}));
      }
    }
  };
  walk(team.steps);
  let prOpened = false;
  for (const a of acts) a.result = resultFor(a, () => { const f = !prOpened; prOpened = true; return f; });
  // one human-approval gate: the first PR open waits for you (approve the push)
  const gate = acts.find((a) => a.skills.includes('github-pr'));
  if (gate) gate.gated = true;
  acts.forEach((a) => { a.status = 'todo'; a.startedAt = 0; a.endedAt = 0; });
  return acts;
}

function act(node, extra) { return { member: node.member, skills: node.skills || [], ...extra }; }

function resultFor(a, prFirst) {
  const s = a.skills, out = [];
  if (s.includes('github-pr')) out.push(prFirst() ? 'PR #142 opened' : 'pushed fixes to PR #142');
  if (s.includes('ticket-status')) out.push('ticket → In Review');
  if (s.includes('github-comment')) out.push(a.approve ? 'approved ✓' : 'left comments on PR #142');
  if (s.includes('github-post')) out.push('results posted to PR #142');
  if (s.includes('run-tests')) out.push('tests pass');
  if (!out.length) out.push(roleNote(a.member, a.approve));
  return out.join(' · ');
}

function roleNote(member, approve) {
  const m = member.toLowerCase();
  if (approve) return 'approved ✓';
  if (/strateg|plan|spec/.test(m)) return 'plan ready';
  if (/review/.test(m)) return 'changes requested';
  if (/qa|test/.test(m)) return 'tests pass';
  if (/cod|dev|eng/.test(m)) return 'implemented';
  if (/release|note|doc/.test(m)) return 'notes drafted';
  return 'done';
}

function fmt(ms) {
  if (ms < 0) ms = 0;
  const s = Math.round(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// Render one frame of the tracker (observable state + timing).
function frame(team, task, acts, runStart, spin) {
  const now = Date.now();
  const total = acts.length;
  const done = acts.filter((a) => a.status === 'done').length;
  const cur = acts.find((a) => a.status === 'running' || a.status === 'waiting');
  let head = `  ${C.bold(team.team)} ${C.dim('· "' + task + '"')}   ${C.cyan(done + '/' + total)}  ${C.dim('⏱ ' + fmt(now - runStart))}`;
  if (cur && cur.loop) head += C.dim(` · loop round ${cur.round}/${cur.loop.max_rounds}`);
  if (cur && cur.status === 'waiting') head += C.yellow('  · waiting for you');
  const lines = [head, ''];

  const firstLoop = acts.findIndex((a) => a.loop);
  const lastLoop = acts.reduce((p, a, i) => (a.loop ? i : p), -1);

  acts.forEach((a, i) => {
    if (i === firstLoop) {
      const l = a.loop;
      lines.push('     ' + C.magenta('┌ loop ') + C.dim(`· until ${l.until} · max ${l.max_rounds}`));
    }
    let icon, time = '', extra = '';
    if (a.status === 'done') { icon = SYM.done; time = C.dim(' ' + fmt(a.endedAt - a.startedAt)); extra = C.dim('   ' + a.result); }
    else if (a.status === 'running') { icon = SYM.run(SPIN[spin % SPIN.length]); time = C.dim(' ' + fmt(now - a.startedAt)); extra = C.dim('   …'); }
    else if (a.status === 'waiting') { icon = C.yellow('⏸'); time = C.dim(' ' + fmt(now - a.startedAt)); extra = C.yellow('   waiting for you: approve the push?'); }
    else { icon = SYM.todo; extra = C.dim('   pending'); }
    const prefix = a.loop ? '     ' + C.magenta('│ ') : '  ';
    const rtag = a.loop ? C.dim(` r${a.round}`) : '';
    const name = (a.status === 'todo' ? C.gray : C.cyan)(a.member.padEnd(12));
    const chips = a.skills.length ? ' ' + a.skills.map((k) => C.blue('·' + k)).join('') : '';
    lines.push(`${prefix}${icon} ${name}${rtag}${chips}${time}${extra}`);
    if (i === lastLoop) lines.push('     ' + C.magenta('└' + '─'.repeat(38)));
  });
  return lines;
}

async function run(team, task, opts = {}) {
  const acts = buildPlan(team);
  const runStart = Date.now();
  const stepMs = opts.fast ? 220 : 1000;
  const waitMs = opts.fast ? 400 : 1600;
  const spinMs = 90;

  if (!isTTY) {
    console.log(`\n  ${team.team} · "${task}"\n`);
    let clock = runStart;
    for (const a of acts) {
      const dur = a.gated ? waitMs : stepMs;
      clock += dur;
      const tag = a.loop ? C.dim(` r${a.round}`) : '';
      const w = a.gated ? C.yellow(' [waited for you]') : '';
      console.log(`  ✔ ${a.member.padEnd(12)}${tag}  ${C.dim(fmt(dur))}  ${a.result}${w}`);
    }
    const rounds = acts.filter((a) => a.loop).reduce((m, a) => Math.max(m, a.round), 0);
    console.log(`\n  done · total ${fmt(clock - runStart)}` + (rounds ? ` · ${rounds} review rounds` : '') + '\n');
    return;
  }

  const painter = new Painter();
  let spin = 0;
  const repaint = () => painter.paint(frame(team, task, acts, runStart, spin));

  for (const a of acts) {
    a.status = 'running';
    a.startedAt = Date.now();
    for (let t = 0; t < Math.ceil(stepMs / spinMs); t++) { repaint(); spin++; await sleep(spinMs); }
    if (a.gated) {
      a.status = 'waiting';
      for (let t = 0; t < Math.ceil(waitMs / spinMs); t++) { repaint(); spin++; await sleep(spinMs); }
    }
    a.status = 'done';
    a.endedAt = Date.now();
    repaint();
  }

  const totalMs = Date.now() - runStart;
  const rounds = acts.filter((a) => a.loop).reduce((m, a) => Math.max(m, a.round), 0);
  const lines = frame(team, task, acts, runStart, spin);
  lines.push('');
  lines.push('  ' + C.green('done') + C.dim(` · total ⏱ ${fmt(totalMs)}`) + (rounds ? C.dim(` · ${rounds} review rounds · PR #142 ready`) : ''));
  painter.paint(lines);
  process.stdout.write('\n');
}

module.exports = { run, buildPlan, frame };
