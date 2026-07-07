'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { C, SYM, SPIN, sleep, Painter, isTTY } = require('./ui');
const compose = require('./compose');
const skills = require('./skills');
const { effectiveSteps } = require('./lineup');

function fmt(ms) {
  if (ms < 0) ms = 0;
  const s = Math.round(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function firstLine(text) {
  const l = String(text).split('\n').map((x) => x.trim()).find((x) => x && !/^verdict:/i.test(x)) || '';
  return l.length > 74 ? l.slice(0, 73) + '…' : l;
}

// A single in-place status line with a spinner + live elapsed (real mode).
function liveLine(label, startedAt) {
  if (!isTTY) { process.stdout.write('  ' + C.dim('▶ ') + label + '\n'); return () => {}; }
  let i = 0;
  const id = setInterval(() => {
    process.stdout.write(`\r  ${C.cyan(SPIN[i++ % SPIN.length])} ${label}  ${C.dim(fmt(Date.now() - startedAt))}   `);
  }, 120);
  return () => { clearInterval(id); process.stdout.write('\r\x1b[0K'); };
}

const DEFAULT_LEAD = 'You are the team lead. Coordinate the members toward the task, keep them focused on what matters, and produce a clear, concrete final result.';

function leadKickoff(team, task) {
  const lead = team.lead || DEFAULT_LEAD;
  const roster = team.steps.flatMap((n) => (n.type === 'loop' ? n.steps : [n])).map((m) => `- ${m.member}: ${m.does || ''}`).join('\n');
  return `${lead}\nYou lead the team "${team.team}"${team.about ? ` (${team.about})` : ''}.\n\nTask: ${task}\n\nThe members, in order:\n${roster}\n\nWrite a SHORT brief (a few lines): what matters for this task, and what each member should focus on. Output only the brief.`;
}

function leadSynthesis(team, task, carryText) {
  const lead = team.lead || DEFAULT_LEAD;
  return `${lead}\nYou lead the team "${team.team}".\n\nTask: ${task}\n\nYour members produced:\n"""\n${carryText}\n"""\n\nSynthesize the final deliverable for the task: a clear, concrete result the user can act on. Output only the final result.`;
}

function memberPrompt(team, task, m, skillDefs, carryText, isGate) {
  let p = `You are the "${m.member}" on the team "${team.team}"${team.about ? ` (${team.about})` : ''}.\n`;
  if (m.role && m.role !== m.does) p += `Your role: ${m.role}\n`;
  p += `Task: ${task}\n\nYour job: ${m.does || m.member}.\n`;
  const sk = (m.skills || []).filter(Boolean);
  if (sk.length) {
    p += `\nApply these skills:\n`;
    for (const s of sk) p += `- ${s}${skillDefs[s] ? ': ' + skillDefs[s] : ''}\n`;
  }
  if (carryText.trim()) p += `\nContext — the team lead's brief and earlier members' work:\n"""\n${carryText}\n"""\n`;
  p += `\nDo your job now, grounded in the task and the context. Be concrete and concise.`;
  if (isGate) p += ` You are a review gate: end with a line exactly "VERDICT: APPROVE" if it is good enough to proceed, or "VERDICT: CHANGES" with the specific changes needed.`;
  p += `\nOutput only your result.`;
  return p;
}

function saveReport(teamName, report) {
  const dir = path.join(os.homedir(), '.my-mini-team', 'runs');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${teamName}-${Date.now()}.md`);
  fs.writeFileSync(file, report);
  return file;
}

function tailSnippet(text) {
  const lines = String(text).trim().split('\n').map((s) => s.trim()).filter(Boolean);
  const last = lines[lines.length - 1] || '';
  return last.length > 72 ? last.slice(0, 71) + '…' : last;
}

function newRow(kind, member, does, skillsArr, model, loop) {
  return { kind, member, does: does || '', skills: skillsArr || [], model: model || '', loop: loop || null, status: 'todo', startedAt: 0, endedAt: 0, activity: '' };
}

// Which member in a loop is the review gate (emits VERDICT and decides the loop).
// Prefer the member named in the loop's `until` clause (e.g. "reviewer approves"),
// then a member that looks like a reviewer by name/skill, else the last member.
// Never assume index 0 — a [coder, reviewer] ordering must gate on the reviewer.
function gateIndex(inner, until) {
  const u = (until || '').toLowerCase();
  const named = inner.findIndex(({ m }) => (m.member || '') && u.includes((m.member || '').toLowerCase()));
  if (named >= 0) return named;
  const reviewy = inner.findIndex(({ m }) =>
    /review|approv|qa|gate|audit/i.test(m.member || '') ||
    (m.skills || []).some((s) => /review|comment|approv/i.test(s)));
  if (reviewy >= 0) return reviewy;
  return inner.length - 1;
}

// Real execution with a live observability panel. Every run has a team lead on
// top: lead briefs -> members execute (loops with real verdicts) -> lead synthesizes.
async function runReal(team, task, opts = {}) {
  const runStart = Date.now();
  const modelFor = (m) => opts.model || (m && m.model) || team.model || null;

  // Resolve `uses:` agents → each member's effective role / skills / model.
  const resolved = effectiveSteps(team);

  const skillDefs = {};
  const collectSkills = (steps) => steps.forEach((n) => {
    if (n.type === 'loop') collectSkills(n.steps);
    else (n.skills || []).forEach((k) => { if (!(k in skillDefs)) { const s = skills.resolve(k); skillDefs[k] = s ? (s.description || '') : ''; } });
  });
  collectSkills(resolved.steps);

  const rows = [];
  const leadBrief = newRow('lead', 'team-lead', 'brief');
  rows.push(leadBrief);
  const plan = [];
  for (const node of resolved.steps) {
    if (node.type === 'loop') {
      const inner = node.steps.map((m) => { const r = newRow('member', m.member, m.does, m.skills, modelFor(m), node); rows.push(r); return { m, row: r }; });
      plan.push({ type: 'loop', node, inner });
    } else {
      const r = newRow('member', node.member, node.does, node.skills, modelFor(node));
      rows.push(r);
      plan.push({ type: 'member', m: node, row: r });
    }
  }
  const leadSynth = newRow('lead', 'team-lead', 'synthesis');
  rows.push(leadSynth);

  const loopRound = new Map();
  let spin = 0;
  const painter = new Painter();

  const rowLine = (r, now) => {
    let icon;
    if (r.status === 'done') icon = SYM.done;
    else if (r.status === 'running') icon = SYM.run(SPIN[spin % SPIN.length]);
    else if (r.status === 'skip') icon = C.dim('⊘');
    else icon = SYM.todo;
    let t;
    if (r.status === 'done') t = C.dim(' ' + fmt(r.endedAt - r.startedAt));
    else if (r.status === 'running') t = C.dim(' ' + fmt(now - r.startedAt));
    else if (r.status === 'skip') t = C.dim(' not needed');
    else t = C.dim(' pending');
    const nm = (r.kind === 'lead' ? C.magenta : (r.status === 'todo' ? C.gray : C.cyan))(r.member.padEnd(14));
    const chips = r.skills && r.skills.length ? ' ' + r.skills.map((k) => C.blue('·' + k)).join('') : '';
    const mdl = r.model ? ' ' + C.dim('(' + r.model + ')') : '';
    return `${icon} ${nm}${chips}${mdl}${t}`;
  };

  const panel = () => {
    const now = Date.now();
    const active = rows.find((r) => r.status === 'running');
    let head = `  ${C.bold(team.team)} ${C.dim('· "' + task + '"')}   ${C.dim('⏱ ' + fmt(now - runStart))}`;
    if (active) head += C.dim('  · now: ') + (active.kind === 'lead' ? C.magenta(active.member) : C.cyan(active.member));
    const lines = [head, ''];
    let i = 0;
    while (i < rows.length) {
      const r = rows[i];
      if (r.loop) {
        const node = r.loop, rr = loopRound.get(node) || 1;
        lines.push('     ' + C.magenta('┌ loop ') + C.dim('· until ' + node.until + ' · round ' + rr + '/' + node.max_rounds));
        while (i < rows.length && rows[i].loop === node) { lines.push('  ' + C.magenta('│ ') + rowLine(rows[i], now)); i++; }
        lines.push('     ' + C.magenta('└' + '─'.repeat(34)));
      } else { lines.push('  ' + rowLine(r, now)); i++; }
    }
    if (active) {
      lines.push('');
      lines.push('  ' + C.cyan('⟳ ' + active.member) + C.dim(' — ' + (active.does || '')));
      if (active.activity) lines.push('    ' + C.dim(active.activity));
    }
    return lines;
  };

  const repaint = () => { if (isTTY) painter.paint(panel()); };
  const timer = isTTY ? setInterval(() => { spin++; repaint(); }, 150) : null;
  if (!isTTY) console.log('\n  ' + C.bold(team.team) + C.dim(' · "' + task + '"') + (opts.model ? C.dim('  · model ' + opts.model) : '') + '\n');

  const carry = [];
  const agent = async (r, prompt) => {
    r.status = 'running'; r.startedAt = Date.now(); r.activity = '';
    if (!isTTY) console.log('  ' + C.dim('▶ ' + r.member + (modelFor(r) ? ' (' + modelFor(r) + ')' : '') + ' …'));
    let out = '';
    try { out = await compose.runClaude(prompt, (acc) => { r.activity = tailSnippet(acc); }, { model: modelFor(r) }); }
    catch (e) { out = '(failed: ' + e.message + ')'; }
    r.status = 'done'; r.endedAt = Date.now(); r.activity = '';
    if (!isTTY) console.log('  ' + C.green('✔') + ' ' + r.member + '  ' + C.dim(fmt(r.endedAt - r.startedAt)) + C.dim('  ' + firstLine(out)));
    return out.trim();
  };

  const brief = await agent(leadBrief, leadKickoff(team, task));
  carry.push('## team-lead brief\n' + brief);

  for (const step of plan) {
    if (step.type === 'member') {
      const out = await agent(step.row, memberPrompt(team, task, step.m, skillDefs, carry.join('\n\n'), false));
      carry.push('## ' + step.m.member + '\n' + out);
    } else {
      const node = step.node;
      let approved = false;
      for (let r = 1; r <= node.max_rounds && !approved; r++) {
        loopRound.set(node, r);
        if (r > 1) step.inner.forEach(({ row: ir }) => { ir.status = 'todo'; });
        const gateIdx = gateIndex(step.inner, node.until);
        for (let k = 0; k < step.inner.length; k++) {
          const { m, row: ir } = step.inner[k];
          const isGate = k === gateIdx;
          const out = await agent(ir, memberPrompt(team, task, m, skillDefs, carry.join('\n\n'), isGate));
          carry.push('## ' + m.member + ' (round ' + r + ')\n' + out);
          if (isGate && /VERDICT:\s*APPROVE/i.test(out)) {
            approved = true;
            for (let j = k + 1; j < step.inner.length; j++) if (step.inner[j].row.status === 'todo') step.inner[j].row.status = 'skip';
            break;
          }
        }
      }
    }
  }

  const final = await agent(leadSynth, leadSynthesis(team, task, carry.join('\n\n')));

  if (timer) clearInterval(timer);
  repaint();

  const totalMs = Date.now() - runStart;
  const report = '# ' + team.team + ' — "' + task + '"\n\n' + carry.join('\n\n') + '\n\n## team-lead — final\n' + final + '\n';
  const file = saveReport(team.team, report);

  process.stdout.write('\n\n  ' + C.bold('result') + '\n\n');
  console.log(final.split('\n').map((l) => '  ' + l).join('\n'));
  console.log('\n  ' + C.green('done') + C.dim(' · total ⏱ ' + fmt(totalMs)) + C.dim('  · report: ') + C.cyan(file) + '\n');
}

async function run(team, task, opts = {}) {
  if (opts.sim) return runSim(team, task, opts);
  return runReal(team, task, opts);
}

// ---------- simulation (kept for a quick, no-cost demo via --sim) ----------

function buildPlan(team) {
  const acts = [];
  const walk = (steps) => {
    for (const n of steps) {
      if (n.type === 'loop') {
        const rounds = Math.max(1, Math.min(2, n.max_rounds || 2));
        for (let r = 1; r <= rounds; r++) {
          const last = r === rounds;
          if (last) acts.push(mk(n.steps[0], { loop: n, round: r, approve: true }));
          else for (const s of n.steps) acts.push(mk(s, { loop: n, round: r }));
        }
      } else acts.push(mk(n, {}));
    }
  };
  walk(team.steps);
  let pr = false;
  for (const a of acts) a.result = simResult(a, () => { const f = !pr; pr = true; return f; });
  acts.forEach((a) => { a.status = 'todo'; a.startedAt = 0; a.endedAt = 0; });
  return acts;
}
function mk(node, extra) { return { member: node.member, skills: node.skills || [], ...extra }; }
function simResult(a, prFirst) {
  const s = a.skills, out = [];
  if (s.includes('github-pr')) out.push(prFirst() ? 'PR #142 opened' : 'pushed fixes');
  if (s.includes('ticket-status')) out.push('ticket → In Review');
  if (s.includes('github-comment')) out.push(a.approve ? 'approved ✓' : 'left comments');
  if (s.includes('github-post')) out.push('results posted');
  if (s.includes('run-tests')) out.push('tests pass');
  if (!out.length) out.push(a.approve ? 'approved ✓' : 'done');
  return out.join(' · ');
}
async function runSim(team, task, opts) {
  const acts = buildPlan(team);
  const stepMs = opts.fast ? 220 : 700;
  console.log(`\n  ${team.team} · "${task}"  ${C.dim('(sim)')}\n`);
  for (const a of acts) {
    a.startedAt = Date.now();
    await sleep(stepMs);
    a.endedAt = Date.now();
    const tag = a.loop ? C.dim(' r' + a.round) : '';
    console.log('  ' + SYM.done + ' ' + C.cyan(a.member.padEnd(12)) + tag + '  ' + C.dim(a.result));
  }
  console.log('\n  ' + C.green('done') + C.dim(' (simulated)') + '\n');
}

module.exports = { run };
