'use strict';
const { C, SYM, sleep } = require('./ui');

async function run(team, task, opts = {}) {
  return runSim(team, task, opts);
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
