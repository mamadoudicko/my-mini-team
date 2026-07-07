'use strict';
// Resolve a normalized team's steps against native subagents (agents). A member
// step can reference an agent via `uses:` — the agent supplies a default role,
// model, and skills, which the step can override or extend. Loops recurse.
const agents = require('./agents');
const { mergeSkills } = require('./model');

// Resolve a single member step against its `uses:` agent (if any).
function resolveStep(step, team) {
  if (!step.uses) return { ...step, skills: step.skills || [], role: step.does, unresolvedAgent: null };
  const agent = agents.resolve(step.uses);
  if (!agent) return { ...step, skills: step.skills || [], unresolvedAgent: step.uses };
  return {
    ...step,
    role: agent.body || agent.description || step.does,
    skills: mergeSkills(agent.skills, step.skills),
    model: step.model || agent.model || team.model || '',
    unresolvedAgent: null,
  };
}

// Deep-walk a team, resolving every member step. Loops keep their shape.
function effectiveSteps(team) {
  const walk = (steps) =>
    steps.map((n) => (n.type === 'loop' ? { ...n, steps: walk(n.steps) } : resolveStep(n, team)));
  return { ...team, steps: walk(team.steps) };
}

// Agent references that don't resolve to a subagent.
function unresolvedAgents(team) {
  const out = [];
  const walk = (steps) => {
    for (const n of steps) {
      if (n.type === 'loop') walk(n.steps);
      else if (n.uses && !agents.resolve(n.uses)) out.push(n.uses);
    }
  };
  walk(team.steps);
  return [...new Set(out)];
}

module.exports = { effectiveSteps, unresolvedAgents };
