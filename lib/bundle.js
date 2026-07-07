'use strict';
// Plain-directory team bundles: <team>.team.yaml + agents/*.md + skills/*/SKILL.md.
// A human-reviewable, git-friendly alternative to the base64 portable token —
// `mmt export` writes one, `mmt import <dir>` reads one after showing a
// manifest + a heuristic capability footprint and getting explicit consent.
const fs = require('fs');
const path = require('path');
const yaml = require('./yaml');
const { normalizeTeam } = require('./model');
const lineup = require('./lineup');
const agents = require('./agents');
const skills = require('./skills');
const store = require('./store');

const byName = (a, b) => a.name.localeCompare(b.name);

// Every `uses:` agent and every effective skill name a team's steps reference.
// Walks lineup.effectiveSteps (not model.teamSkills) so agent-default skills
// of `uses:` steps are included, not just step-level skills — teamSkills only
// sees the raw step tokens. `uses:` steps already come back merged/de-duped/
// de-'+'d via mergeSkills; member-only steps keep their raw step.skills as
// authored, so leading '+' is stripped here too (they never pass through
// mergeSkills).
function gatherRefs(team) {
  const agentNames = new Set();
  const skillNames = new Set();
  const walk = (steps) => {
    for (const n of steps) {
      if (n.type === 'loop') { walk(n.steps); continue; }
      if (n.uses) agentNames.add(n.uses);
      for (const s of (n.skills || [])) skillNames.add(String(s).replace(/^\+/, ''));
    }
  };
  walk(lineup.effectiveSteps(team).steps);
  return { agentNames: [...agentNames], skillNames: [...skillNames] };
}

// Gather everything a team's effective steps reference, resolve each against
// native sources (agents/skills), and split resolved from unresolved.
function collect(team) {
  const { agentNames, skillNames } = gatherRefs(team);

  const resolvedAgents = [];
  const unresolvedAgents = [];
  for (const name of agentNames) {
    const a = agents.resolve(name);
    if (a) resolvedAgents.push({ name, content: a.content });
    else unresolvedAgents.push(name);
  }

  const resolvedSkills = [];
  const unresolvedSkills = [];
  for (const name of skillNames) {
    if (name.includes('/') || name.startsWith('~')) { unresolvedSkills.push(name); continue; } // path/~ refs are never bundled
    const s = skills.resolve(name);
    if (s) resolvedSkills.push({ name, content: s.content });
    else unresolvedSkills.push(name);
  }

  resolvedAgents.sort(byName);
  resolvedSkills.sort(byName);
  unresolvedAgents.sort();
  unresolvedSkills.sort();

  return {
    team: { name: team.team, yamlText: store.loadRaw(team.team) },
    agents: resolvedAgents,
    skills: resolvedSkills,
    unresolved: { agents: unresolvedAgents, skills: unresolvedSkills },
  };
}

// Write a bundle to a plain directory: <team>.team.yaml at the root,
// agents/<name>.md, skills/<name>/SKILL.md. Refuses to clobber an existing
// destDir unless opts.force.
function writeDir(bundle, destDir, opts = {}) {
  if (fs.existsSync(destDir) && !opts.force) {
    throw new Error(`"${destDir}" already exists — use --force to overwrite`);
  }
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(path.join(destDir, `${bundle.team.name}.team.yaml`), bundle.team.yamlText);

  if (bundle.agents.length) {
    const dir = path.join(destDir, 'agents');
    fs.mkdirSync(dir, { recursive: true });
    for (const a of bundle.agents) fs.writeFileSync(path.join(dir, `${a.name}.md`), a.content);
  }
  if (bundle.skills.length) {
    for (const s of bundle.skills) {
      const dir = path.join(destDir, 'skills', s.name);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'SKILL.md'), s.content);
    }
  }
  return destDir;
}

// Read a plain-directory bundle back. A single *.team.yaml must sit at the
// dir root (non-recursive) — zero or multiple is an error. Sibling agents/
// and skills/ are optional. Any directory shaped like <team>/<team>.team.yaml
// + skills/<name>/SKILL.md reads back unmodified.
function readDir(dir) {
  const teamFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.team.yaml'));
  if (teamFiles.length === 0) throw new Error(`"${dir}" is not a team bundle — no *.team.yaml found at its root`);
  if (teamFiles.length > 1) throw new Error(`ambiguous bundle — multiple *.team.yaml files in "${dir}": ${teamFiles.join(', ')}`);

  const yamlText = fs.readFileSync(path.join(dir, teamFiles[0]), 'utf8');
  const team = normalizeTeam(yaml.parse(yamlText));

  const resolvedAgents = [];
  const agentsDir = path.join(dir, 'agents');
  if (fs.existsSync(agentsDir)) {
    for (const f of fs.readdirSync(agentsDir)) {
      if (!f.endsWith('.md')) continue;
      resolvedAgents.push({ name: f.replace(/\.md$/, ''), content: fs.readFileSync(path.join(agentsDir, f), 'utf8') });
    }
  }

  const resolvedSkills = [];
  const skillsDir = path.join(dir, 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const name of fs.readdirSync(skillsDir)) {
      const f = path.join(skillsDir, name, 'SKILL.md');
      if (fs.existsSync(f)) resolvedSkills.push({ name, content: fs.readFileSync(f, 'utf8') });
    }
  }

  resolvedAgents.sort(byName);
  resolvedSkills.sort(byName);

  return {
    team: { name: team.team, yamlText },
    agents: resolvedAgents,
    skills: resolvedSkills,
    unresolved: { agents: [], skills: [] },
  };
}

// Printable summary lines — no console.log here, callers print them.
function manifest(bundle) {
  const lines = [];
  lines.push(`team: ${bundle.team.name}`);
  lines.push(`agents (${bundle.agents.length}): ${bundle.agents.map((a) => a.name).join(', ') || 'none'}`);
  lines.push(`skills (${bundle.skills.length}): ${bundle.skills.map((s) => s.name).join(', ') || 'none'}`);
  const unAgents = (bundle.unresolved && bundle.unresolved.agents) || [];
  const unSkills = (bundle.unresolved && bundle.unresolved.skills) || [];
  if (unAgents.length || unSkills.length) {
    const parts = [];
    if (unAgents.length) parts.push(`agents: ${unAgents.join(', ')}`);
    if (unSkills.length) parts.push(`skills: ${unSkills.join(', ')}`);
    lines.push(`not bundled (unresolved): ${parts.join(' · ')}`);
  }
  return lines;
}

// Word-bounded so "digit"/"legit" never trip the git check.
const FOOTPRINT_CHECKS = [
  { label: 'runs git', re: /\bgit\b/i },
  { label: 'uses the gh CLI', re: /\bgh\b/i },
  { label: 'makes network requests', re: /https?:\/\// },
  { label: 'writes or executes files', re: /\b(write ?file|writefilesync|exec|spawn|rm -rf|curl|chmod)\b/i },
];

// A clearly-labeled *heuristic* scan of everything in a bundle — never a
// guarantee, just a quick "what might this touch" before you install it.
function footprint(bundle) {
  const text = [...bundle.agents, ...bundle.skills].map((x) => x.content).join('\n');
  const hits = FOOTPRINT_CHECKS.filter((c) => c.re.test(text)).map((c) => c.label);
  const lines = ['capability footprint (heuristic estimate — not a guarantee):'];
  lines.push(hits.length ? '  ' + hits.join(' · ') : '  no notable capabilities detected');
  return lines;
}

module.exports = { collect, writeDir, readDir, manifest, footprint };
