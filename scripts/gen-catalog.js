#!/usr/bin/env node
'use strict';
// Regenerate the catalog index from catalog/<user>/<team>/ dirs.
// Targets (same list, per-target link base):
//   - README.md               relative links (`catalog/<user>/<team>/`)
//   - website/docs/library.md  absolute GitHub links (the docs site can't
//                              resolve repo-relative paths)
// Zero deps, Node 18+. Reuses lib/yaml + lib/model so the index can't drift
// from what mmt actually reads.
//
//   node scripts/gen-catalog.js          # rewrite any stale target
//   node scripts/gen-catalog.js --check  # write nothing; exit non-zero if stale/broken

const fs = require('fs');
const path = require('path');
const yaml = require('../lib/yaml');
const { normalizeTeam, teamSkills } = require('../lib/model');
const { descOf } = require('../lib/skills');

const ROOT = path.join(__dirname, '..');
const CATALOG = path.join(ROOT, 'catalog');
const SKILLS_CATALOG = path.join(CATALOG, 'skills');
const START = '<!-- mmt:catalog:start -->';
const END = '<!-- mmt:catalog:end -->';
const SKILLS_START = '<!-- mmt:skills:start -->';
const SKILLS_END = '<!-- mmt:skills:end -->';

const GH_TREE = 'https://github.com/mamadoudicko/my-mini-team/tree/main/catalog/';
const TARGETS = [
  { file: path.join(ROOT, 'README.md'), base: 'catalog/', skillsBase: 'catalog/skills/' },
  { file: path.join(ROOT, 'website', 'docs', 'library.md'), base: GH_TREE, skillsBase: GH_TREE + 'skills/' },
];

function dirsIn(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

// Collect one entry per catalogued team, sorted by <user> then <team>.
function collectEntries() {
  const entries = [];
  for (const user of dirsIn(CATALOG)) {
    if (user === 'skills') continue; // catalog/skills/ holds standalone skills, not teams
    for (const teamDir of dirsIn(path.join(CATALOG, user))) {
      const yamlPath = path.join(CATALOG, user, teamDir, teamDir + '.team.yaml');
      if (!fs.existsSync(yamlPath)) {
        process.stderr.write(`warn: ${path.relative(ROOT, yamlPath)} not found — skipping ${user}/${teamDir}\n`);
        continue;
      }
      let team;
      try {
        team = normalizeTeam(yaml.parse(fs.readFileSync(yamlPath, 'utf8')));
      } catch (e) {
        process.stderr.write(`warn: could not parse ${path.relative(ROOT, yamlPath)}: ${e.message} — skipping\n`);
        continue;
      }
      if (team.team !== teamDir) {
        process.stderr.write(`warn: ${user}/${teamDir}: team field "${team.team}" != directory name "${teamDir}"\n`);
      }
      teamSkills(team); // reuse the model for validation
      entries.push({ user, team: teamDir, desc: team.about || team.team });
    }
  }
  entries.sort((a, b) => (a.user === b.user ? a.team.localeCompare(b.team) : a.user.localeCompare(b.user)));
  return entries;
}

// Collect one entry per standalone catalog skill, sorted by <user> then <skill>.
function collectSkills() {
  const out = [];
  for (const user of dirsIn(SKILLS_CATALOG)) {
    for (const skill of dirsIn(path.join(SKILLS_CATALOG, user))) {
      const md = path.join(SKILLS_CATALOG, user, skill, 'SKILL.md');
      if (!fs.existsSync(md)) {
        process.stderr.write(`warn: ${path.relative(ROOT, md)} not found — skipping ${user}/${skill}\n`);
        continue;
      }
      const desc = descOf(fs.readFileSync(md, 'utf8'));
      out.push({ user, skill, desc: desc || skill });
    }
  }
  out.sort((a, b) => (a.user === b.user ? a.skill.localeCompare(b.skill) : a.user.localeCompare(b.user)));
  return out;
}

function lineFor(e, base) {
  return `- [${e.user}/${e.team}](${base}${e.user}/${e.team}/) — ${e.desc}`;
}

function skillLineFor(e, base) {
  return `- [${e.user}/${e.skill}](${base}${e.user}/${e.skill}/) — ${e.desc}`;
}

// Replace the region between start/end markers, or return null if either is missing.
function render(current, start, end, body) {
  const s = current.indexOf(start);
  const e = current.indexOf(end);
  if (s === -1 || e === -1 || e < s) return null;
  const before = current.slice(0, s + start.length);
  const after = current.slice(e);
  const middle = body ? '\n' + body + '\n' : '\n';
  return before + middle + after;
}

function main() {
  const check = process.argv.includes('--check');
  const entries = collectEntries();
  const skillEntries = collectSkills();
  let stale = false;
  let wrote = 0;

  for (const t of TARGETS) {
    if (!fs.existsSync(t.file)) {
      process.stderr.write(`warn: target ${path.relative(ROOT, t.file)} not found — skipping\n`);
      continue;
    }
    const current = fs.readFileSync(t.file, 'utf8');
    const teamBody = entries.map((e) => lineFor(e, t.base)).join('\n');
    let next = render(current, START, END, teamBody);
    if (next === null) {
      process.stderr.write(`error: markers ${START} / ${END} missing from ${path.relative(ROOT, t.file)}\n`);
      process.exit(1);
    }
    const skillBody = skillEntries.map((e) => skillLineFor(e, t.skillsBase)).join('\n');
    next = render(next, SKILLS_START, SKILLS_END, skillBody);
    if (next === null) {
      process.stderr.write(`error: markers ${SKILLS_START} / ${SKILLS_END} missing from ${path.relative(ROOT, t.file)}\n`);
      process.exit(1);
    }
    if (next === current) continue;
    stale = true;
    if (!check) {
      fs.writeFileSync(t.file, next);
      wrote++;
      process.stdout.write(`catalog: wrote ${path.relative(ROOT, t.file)}\n`);
    }
  }

  if (check) {
    if (stale) {
      process.stderr.write('error: catalog section is stale — run `npm run catalog`\n');
      process.exit(1);
    }
    process.exit(0);
  }
  if (!wrote) {
    process.stdout.write(`catalog: up to date (${entries.length} team${entries.length === 1 ? '' : 's'}, ${skillEntries.length} skill${skillEntries.length === 1 ? '' : 's'})\n`);
  }
}

main();
