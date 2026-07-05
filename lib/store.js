'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('./yaml');
const { normalizeTeam } = require('./model');

// Two scopes: `local` (this folder's teams/) and `global` (~/.my-mini-team/teams/).
// Local shadows global when names collide. Default for new teams is global.
function scopes() {
  return [
    { scope: 'local', dir: path.join(process.cwd(), 'teams') },
    { scope: 'global', dir: path.join(os.homedir(), '.my-mini-team', 'teams') },
  ];
}

function globalDir() { return path.join(os.homedir(), '.my-mini-team', 'teams'); }
function localDir() { return path.join(process.cwd(), 'teams'); }

// All team files across both scopes (every copy, not deduped).
function allFiles() {
  const out = [];
  for (const { scope, dir } of scopes()) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.team.yaml')) {
        out.push({ name: f.replace(/\.team\.yaml$/, ''), file: path.join(dir, f), scope });
      }
    }
  }
  return out;
}

// Deduped view: local wins over global for the same name.
function listFiles() {
  const seen = new Set();
  const out = [];
  for (const e of allFiles()) {
    if (seen.has(e.name)) continue;
    seen.add(e.name);
    out.push(e);
  }
  return out;
}

function loadAll() {
  return listFiles().map((e) => {
    try {
      return { name: e.name, scope: e.scope, team: normalizeTeam(yaml.parse(fs.readFileSync(e.file, 'utf8'))) };
    } catch (err) {
      return { name: e.name, scope: e.scope, error: err.message };
    }
  });
}

function loadTeam(name) {
  const hit = listFiles().find((f) => f.name === name);
  return hit ? normalizeTeam(yaml.parse(fs.readFileSync(hit.file, 'utf8'))) : null;
}

function loadRaw(name) {
  const hit = listFiles().find((f) => f.name === name);
  return hit ? fs.readFileSync(hit.file, 'utf8') : null;
}

function fileOf(name) {
  const hit = listFiles().find((f) => f.name === name);
  return hit ? hit.file : null;
}

// Every copy of a name across scopes.
function filesOf(name) {
  return allFiles().filter((f) => f.name === name);
}

function deleteTeam(name) {
  const hits = filesOf(name);
  hits.forEach((h) => fs.unlinkSync(h.file));
  return hits.map((h) => h.file);
}

// Save a new team into a scope (global by default).
function saveTeam(name, yamlText, opts = {}) {
  const dir = opts.local ? localDir() : globalDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.team.yaml`);
  fs.writeFileSync(file, yamlText);
  return file;
}

// Overwrite a specific file in place (used by edit).
function saveAt(file, yamlText) {
  fs.writeFileSync(file, yamlText);
  return file;
}

module.exports = {
  loadAll, loadTeam, loadRaw, fileOf, filesOf,
  saveTeam, saveAt, deleteTeam, listFiles, allFiles,
};
