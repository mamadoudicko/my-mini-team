'use strict';
// Agent-composed workflows: turn a plain-language description into a team file
// (and apply plain-language edits) by shelling out to the local `claude` CLI.
const { spawn } = require('child_process');
const yaml = require('./yaml');

const SCHEMA = `You convert a plain-language description of how a team ships work into a workflow file for the "mmt" CLI. Output ONLY valid YAML in the schema below. No prose, no explanations, no code fences.

Schema:
- team: short-kebab-name
- about: one short line
- steps: an ordered list. Each item is either a MEMBER or a LOOP.
  MEMBER:
    - member: role-name
      does: what this role does
      skills: [skill, ...]   # optional capacities
      model: opus            # optional: opus | sonnet | haiku (only if the description says which model)
  LOOP (for a review/fix cycle that repeats):
    - loop:
        until: exit condition
        max_rounds: 3
        steps: [ ...members... ]

Known skills (use when the description implies the capacity): github-pr, github-comment, github-post, ticket-status, run-tests, notion, web-search, deploy.

Rules:
- Include EVERY stage the description mentions. Never drop a member, a review loop, or a qa step that was described. If the text says "reviewer loops with the coder until approved" you MUST produce a loop with reviewer + coder. If it says "qa runs tests" you MUST include a qa member.
- Infer sensible members and their order from the description.
- Attach skills only when the text implies that capacity (open a PR, comment on github, update the ticket, run tests, search, deploy...).
- Use a loop when there is a review-then-fix cycle.
- Keep member names short and lowercase.

Example description: "spec to shipped: a strategist plans, a coder builds, opens a PR and updates the ticket, a reviewer comments on github and loops with the coder until approved, then qa runs tests and posts the results"
Example output:
team: spec-to-prod
about: ship a feature end to end
steps:
  - member: strategist
    does: turn the task into a plan
  - member: coder
    does: implement and open a PR
    skills: [github-pr, ticket-status]
  - loop:
      until: reviewer approves
      max_rounds: 3
      steps:
        - member: reviewer
          does: review the diff
          skills: [github-comment]
        - member: coder
          does: address the comments
          skills: [github-pr]
  - member: qa
    does: run tests and post the results
    skills: [run-tests, github-post]`;

function runClaude(prompt, onChunk, opts = {}) {
  return new Promise((resolve, reject) => {
    const args = ['-p', prompt];
    if (opts.model) args.push('--model', opts.model);
    let p;
    try { p = spawn('claude', args, { stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { return reject(new Error('could not start claude: ' + e.message)); }
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; if (onChunk) { try { onChunk(out); } catch (_) {} } });
    p.stderr.on('data', (d) => (err += d));
    p.on('error', (e) => reject(new Error('could not run claude (' + e.message + ')')));
    p.on('close', () => {
      if (!out.trim()) reject(new Error('claude returned nothing' + (err ? ': ' + err.trim() : '')));
      else resolve(out);
    });
  });
}

function extractYaml(s) {
  let t = String(s).trim();
  const fence = t.match(/```(?:yaml)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  const m = t.match(/^team:/m);
  if (m) return t.slice(m.index).trim();
  return t;
}

async function compose(text) {
  const raw = await runClaude(`${SCHEMA}\n\nNow convert this description into the YAML:\n"""${text}"""\n\nOutput ONLY the YAML.`);
  const y = extractYaml(raw);
  yaml.parse(y); // validate
  return y;
}

async function edit(currentYaml, instruction) {
  const raw = await runClaude(`${SCHEMA}\n\nHere is the current team YAML:\n"""\n${currentYaml}\n"""\n\nApply this change: ${instruction}\n\nOutput ONLY the full updated YAML.`);
  const y = extractYaml(raw);
  yaml.parse(y);
  return y;
}

const SKILL_SCHEMA = `You write a Claude Code Skill file (SKILL.md) for the "mmt" tool. A skill is ONE reusable capability, expressed as inert know-how: concrete instructions for how to do that one thing well. It must NOT contain workflow or orchestration — no "first do X, then Y" sequencing across steps, no deciding which other members run. Output ONLY the file content — no prose, no explanations, no code fences.

Exact format:
---
name: <kebab-name>
description: <one sentence saying when and what — this is what Claude auto-discovers the skill by>
---

# <name>

<clear, concrete instructions for performing this one capability well>`;

// Strip a surrounding ``` fence if the model added one.
function stripFence(s) {
  const t = String(s).trim();
  const m = t.match(/```(?:markdown|md)?\s*([\s\S]*?)```/i);
  return m ? m[1].trim() : t;
}

// Compose a SKILL.md from a plain-language description of the capability.
async function composeSkill(name, description) {
  const raw = await runClaude(`${SKILL_SCHEMA}\n\nName: ${name}\nCapability: """${description}"""\n\nOutput ONLY the SKILL.md file content.`);
  let out = stripFence(raw);
  if (!/^---/.test(out)) {
    // Model skipped the frontmatter — wrap the body in it.
    out = `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\n${out}\n`;
  } else {
    // Force the name field to the one the user asked for.
    out = out.replace(/^name:\s*.*$/m, `name: ${name}`);
  }
  if (!out.endsWith('\n')) out += '\n';
  return out;
}

module.exports = { compose, edit, composeSkill, runClaude };
