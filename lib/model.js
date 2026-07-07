'use strict';
// Normalize a parsed team file into a workflow of nodes.
// A node is either a member { type:'member', member, does, skills[] }
// or a loop    { type:'loop', until, max_rounds, steps:[...] }.

function normalizeSteps(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((n) => {
    if (n && n.loop) {
      const l = n.loop;
      return {
        type: 'loop',
        until: l.until || 'the gate approves',
        max_rounds: l.max_rounds || 3,
        steps: normalizeSteps(l.steps),
      };
    }
    return {
      type: 'member',
      uses: n.uses || null,
      member: n.member || n.name || n.uses || 'member',
      does: n.does || '',
      skills: n.skills === undefined ? null : toList(n.skills),
      model: n.model || '',
    };
  });
}

function toList(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v.map(String) : [String(v)];
}

// Merge an agent's default skills with a step's skill tokens.
// Tokens starting with '+' are additive; otherwise the tokens replace.
const dedupe = (a) => [...new Set(a.filter(Boolean))];
function mergeSkills(agentDefaults, stepTokens) {
  const defaults = (agentDefaults || []).map(String);
  if (stepTokens == null) return dedupe(defaults);
  const tokens = stepTokens.map(String);
  const additive = tokens.some((t) => t.startsWith('+'));
  const stripped = tokens.map((t) => t.replace(/^\+/, ''));
  return additive ? dedupe([...defaults, ...stripped]) : dedupe(stripped);
}

function normalizeTeam(raw) {
  return {
    team: raw.team || raw.name || 'untitled',
    about: raw.about || raw.description || '',
    example: raw.example || '',
    lead: raw.lead || '',
    model: raw.model || '',
    steps: normalizeSteps(raw.steps),
  };
}

// Count member nodes (loops counted by their inner members) for headers.
function memberCount(steps) {
  let n = 0;
  for (const s of steps) {
    if (s.type === 'loop') n += memberCount(s.steps);
    else n += 1;
  }
  return n;
}

// Unique skill references used anywhere in a team.
function teamSkills(team) {
  const set = new Set();
  const walk = (steps) => {
    for (const n of steps) {
      if (n.type === 'loop') walk(n.steps);
      else (n.skills || []).forEach((s) => set.add(String(s).replace(/^\+/, '')));
    }
  };
  walk(team.steps);
  return [...set];
}

module.exports = { normalizeTeam, normalizeSteps, memberCount, teamSkills, mergeSkills };
