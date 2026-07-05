'use strict';
const { C, SYM } = require('./ui');

// One-line compressed shape, e.g. strategist → coder → [reviewer ⟳] → qa
function shapeLine(team) {
  const parts = team.steps.map((n) => {
    if (n.type === 'loop') {
      const inner = n.steps.map((s) => C.cyan(s.member)).join(` ${SYM.arrow} `);
      return `${C.magenta('[')}${inner} ${SYM.loopMark}${C.magenta(']')}`;
    }
    return C.cyan(n.member);
  });
  return parts.join(` ${SYM.arrow} `);
}

// Full workflow block (for `mmt show`).
function workflowBlock(team) {
  const lines = [];
  lines.push('  ' + C.bold(team.team) + (team.about ? C.dim('   ' + team.about) : ''));
  lines.push('');
  let i = 0;
  for (const n of team.steps) {
    if (n.type === 'loop') {
      lines.push('     ' + C.magenta(`┌ loop `) + C.dim(`· until ${n.until} · max ${n.max_rounds}`));
      for (const s of n.steps) {
        i += 1;
        lines.push('     ' + C.magenta('│ ') + memberLine(i, s));
      }
      lines.push('     ' + C.magenta('└' + '─'.repeat(38)));
    } else {
      i += 1;
      lines.push('  ' + memberLine(i, n));
    }
  }
  return lines;
}

function memberLine(i, s) {
  const num = C.dim(`${i}.`);
  const name = C.cyan(s.member.padEnd(14));
  const chips = s.skills.length ? '  ' + s.skills.map((k) => C.blue('·' + k)).join(' ') : '';
  const does = s.does ? C.dim('  ' + s.does) : '';
  return `${num} ${name}${chips}${does}`;
}

module.exports = { shapeLine, workflowBlock, memberLine };
