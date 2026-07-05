'use strict';
// Skills are real, reusable capability definitions (SKILL.md), plugged into a
// member by name or path. Resolved across three sources so mmt reuses the
// Claude Code skills you already have, plus its own library.
const fs = require('fs');
const path = require('path');
const os = require('os');

function sources() {
  return [
    { source: 'project', dir: path.join(process.cwd(), '.claude', 'skills') },
    { source: 'mmt', dir: path.join(os.homedir(), '.my-mini-team', 'skills') },
    { source: 'claude', dir: path.join(os.homedir(), '.claude', 'skills') },
  ];
}

function skillFileIn(dir, name) {
  const inDir = path.join(dir, name, 'SKILL.md');
  if (fs.existsSync(inDir)) return inDir;
  const flat = path.join(dir, name + '.md');
  if (fs.existsSync(flat)) return flat;
  return null;
}

function descOf(content) {
  const fm = content.match(/^description:\s*(.*)$/m);
  if (fm) {
    let v = fm[1].trim().replace(/^["']|["']$/g, '');
    if (/^[>|][-+]?$/.test(v) || v === '') {
      // block scalar or empty: gather following indented lines
      const lines = content.split('\n');
      const idx = lines.findIndex((l) => /^description:/.test(l));
      const out = [];
      for (let i = idx + 1; i < lines.length; i++) {
        if (/^\s+\S/.test(lines[i])) out.push(lines[i].trim());
        else break;
      }
      if (out.length) return out.join(' ').trim();
    }
    if (v) return v;
  }
  const body = content.replace(/^---[\s\S]*?---/, '').trim();
  const line = body.split('\n').find((l) => l.trim() && !l.startsWith('#'));
  return line ? line.trim() : '';
}

function readSkill(file, name, source) {
  const content = fs.readFileSync(file, 'utf8');
  return { name, source, file, description: descOf(content), content };
}

// Resolve a reference: a plain name (searched across sources) or a path.
function resolve(ref) {
  if (!ref) return null;
  if (ref.includes('/') || ref.startsWith('~')) {
    let p = ref.replace(/^~/, os.homedir());
    if (!fs.existsSync(p)) return null;
    if (fs.statSync(p).isDirectory()) {
      const f = path.join(p, 'SKILL.md');
      if (!fs.existsSync(f)) return null;
      p = f;
    }
    return readSkill(p, path.basename(ref).replace(/\.md$/, ''), 'path');
  }
  for (const { source, dir } of sources()) {
    const f = skillFileIn(dir, ref);
    if (f) return readSkill(f, ref, source);
  }
  return null;
}

function list() {
  const seen = new Set();
  const out = [];
  for (const { source, dir } of sources()) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      const name = entry.replace(/\.md$/, '');
      const f = skillFileIn(dir, name);
      if (!f || seen.has(name)) continue;
      seen.add(name);
      out.push(readSkill(f, name, source));
    }
  }
  return out;
}

function mmtSkillPath(name) {
  return path.join(os.homedir(), '.my-mini-team', 'skills', name, 'SKILL.md');
}

function writeMmtSkill(name, content) {
  const file = mmtSkillPath(name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}

module.exports = { resolve, list, mmtSkillPath, writeMmtSkill, descOf, sources };
