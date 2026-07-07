'use strict';
// Minimal YAML writer for the team model (the repo's yaml.js only parses).
// Emits the exact subset mmt teams use, so the editor can save back a file that
// round-trips through normalizeTeam. Not a general YAML dumper.

// Quote a scalar only when it could be misread (has :, #, leading/trailing space,
// or YAML-special leading chars). Otherwise emit it bare.
function scalar(v) {
  const s = String(v);
  if (s === '') return "''";
  if (/[:#]|^\s|\s$|^[-?&*!|>%@`"']/.test(s) || /^(true|false|null|yes|no|~)$/i.test(s)) {
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return s;
}

// A skills flow list: [a, +b]. Caller decides whether to emit (null → omit).
function skillsList(skills) {
  return '[' + skills.map((s) => scalar(s)).join(', ') + ']';
}

function memberLines(step, indent) {
  const pad = ' '.repeat(indent);
  const key = step.uses ? 'uses' : 'member';
  const val = step.uses || step.member || 'member';
  const out = [pad + '- ' + key + ': ' + scalar(val)];
  const pad2 = ' '.repeat(indent + 2);
  if (step.does) out.push(pad2 + 'does: ' + scalar(step.does));
  // skills: null → inherit (omit); [] → explicit replace-with-none; [...] → list
  if (step.skills != null) out.push(pad2 + 'skills: ' + skillsList(step.skills));
  if (step.model) out.push(pad2 + 'model: ' + scalar(step.model));
  return out;
}

function stepLines(node, indent) {
  if (node.type === 'loop') {
    const pad = ' '.repeat(indent);
    const pad2 = ' '.repeat(indent + 4);
    const out = [pad + '- loop:'];
    out.push(pad2 + 'until: ' + scalar(node.until || 'the reviewer approves'));
    out.push(pad2 + 'max_rounds: ' + (node.max_rounds || 3));
    out.push(pad2 + 'steps:');
    node.steps.forEach((m) => out.push(...memberLines(m, indent + 6)));
    return out;
  }
  return memberLines(node, indent);
}

// Serialize a normalized team back to YAML text.
function teamToYaml(team) {
  const out = [];
  out.push('team: ' + scalar(team.team || 'untitled'));
  if (team.about) out.push('about: ' + scalar(team.about));
  if (team.example) out.push('example: ' + scalar(team.example));
  if (team.model) out.push('model: ' + scalar(team.model));
  if (team.lead) out.push('lead: ' + scalar(team.lead));
  out.push('steps:');
  (team.steps || []).forEach((n) => out.push(...stepLines(n, 2)));
  return out.join('\n') + '\n';
}

// Serialize a native Claude subagent back to its .md (frontmatter + body),
// preserving the role body. Round-trips through lib/agents' parsers.
function agentToMd(a) {
  const name = a.name || 'agent';
  const out = ['---', 'name: ' + scalar(name), 'description: ' + scalar(a.description || '')];
  if (a.model) out.push('model: ' + scalar(a.model));
  out.push('skills: ' + skillsList(a.skills || []));
  out.push('---', '', '# ' + name, '');
  if (a.body) out.push(a.body);
  return out.join('\n').replace(/\n*$/, '') + '\n';
}

module.exports = { teamToYaml, agentToMd };
