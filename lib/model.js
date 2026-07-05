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
      member: n.member || n.name || 'member',
      does: n.does || '',
      skills: toList(n.skills),
      model: n.model || '',
    };
  });
}

function toList(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v.map(String) : [String(v)];
}

function normalizeTeam(raw) {
  return {
    team: raw.team || raw.name || 'untitled',
    about: raw.about || raw.description || '',
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
      else (n.skills || []).forEach((s) => set.add(s));
    }
  };
  walk(team.steps);
  return [...set];
}

module.exports = { normalizeTeam, normalizeSteps, memberCount, teamSkills };
