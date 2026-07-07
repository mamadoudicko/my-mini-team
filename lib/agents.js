'use strict';
// Agents are native Claude Code subagents (a flat file .claude/agents/<name>.md)
// that a member can delegate to. Resolved across project and user sources so mmt
// reuses the subagents you already have. Precedence PROJECT > USER (project
// shadows user), which matches native subagent discovery.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { descOf } = require('./skills');

// Project first → a project subagent shadows a user one of the same name.
function sources() {
  return [
    { source: 'project', dir: path.join(process.cwd(), '.claude', 'agents') },
    { source: 'user', dir: path.join(os.homedir(), '.claude', 'agents') },
  ];
}

// Flat file only: .claude/agents/<name>.md (NOT a dir, NOT <name>.agent.md).
function agentFileIn(dir, name) {
  const flat = path.join(dir, name + '.md');
  if (fs.existsSync(flat)) return flat;
  return null;
}

// The --- ... --- frontmatter block, or '' when there isn't one.
function fmBlock(content) {
  const m = String(content).match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : '';
}

// Parse `model:` from the frontmatter block.
function modelOf(content) {
  const m = fmBlock(content).match(/^model:\s*(.*)$/m);
  if (!m) return '';
  return m[1].trim().replace(/^["']|["']$/g, '');
}

// Parse an inline `skills: [a, b]` list from the frontmatter block → array.
function skillsOf(content) {
  const m = fmBlock(content).match(/^skills:\s*\[(.*)\]\s*$/m);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

// The role body: everything after the frontmatter, minus a leading `# heading`.
// This is the agent's real instructions (its system prompt) — what a member runs on.
function bodyOf(content) {
  return String(content)
    .replace(/^---\n[\s\S]*?\n---\n?/, '')
    .replace(/^\s*#[^\n]*\n+/, '')
    .trim();
}

function readAgent(file, name, source) {
  const content = fs.readFileSync(file, 'utf8');
  return {
    name,
    source,
    file,
    description: descOf(content),
    body: bodyOf(content),
    model: modelOf(content),
    skills: skillsOf(content),
    content,
  };
}

// Resolve a reference: a path (has '/' or starts '~') or a plain name.
function resolve(ref) {
  if (!ref) return null;
  if (ref.includes('/') || ref.startsWith('~')) {
    let p = ref.replace(/^~/, os.homedir()).replace(/\.md$/, '') + '.md';
    if (!fs.existsSync(p)) return null;
    return readAgent(p, path.basename(ref).replace(/\.md$/, ''), 'path');
  }
  for (const { source, dir } of sources()) {
    const f = agentFileIn(dir, ref);
    if (f) return readAgent(f, ref, source);
  }
  return null;
}

function list() {
  const seen = new Set();
  const out = [];
  for (const { source, dir } of sources()) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      if (!/\.md$/.test(entry)) continue;
      const name = entry.replace(/\.md$/, '');
      const f = agentFileIn(dir, name);
      if (!f || seen.has(name)) continue;
      seen.add(name);
      out.push(readAgent(f, name, source));
    }
  }
  return out;
}

// Native subagent location: ./.claude/agents (project) or ~/.claude/agents (user).
function agentDir(local) {
  return local
    ? path.join(process.cwd(), '.claude', 'agents')
    : path.join(os.homedir(), '.claude', 'agents');
}

// Write a subagent to its native flat-file location. opts.local → project scope.
function writeAgent(name, content, opts = {}) {
  const file = path.join(agentDir(!!opts.local), name + '.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}

module.exports = { resolve, list, agentDir, writeAgent, sources, modelOf, skillsOf, bodyOf };
