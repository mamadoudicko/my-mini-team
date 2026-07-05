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

const ROOT = path.join(__dirname, '..');
const CATALOG = path.join(ROOT, 'catalog');
const START = '<!-- mmt:catalog:start -->';
const END = '<!-- mmt:catalog:end -->';

const GH_TREE = 'https://github.com/mamadoudicko/my-mini-team/tree/main/catalog/';
const TARGETS = [
  { file: path.join(ROOT, 'README.md'), base: 'catalog/' },
  { file: path.join(ROOT, 'website', 'docs', 'library.md'), base: GH_TREE },
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

function lineFor(e, base) {
  return `- [${e.user}/${e.team}](${base}${e.user}/${e.team}/) — ${e.desc}`;
}

// Replace the marked region, or return null if the markers are missing.
function render(current, body) {
  const s = current.indexOf(START);
  const e = current.indexOf(END);
  if (s === -1 || e === -1 || e < s) return null;
  const before = current.slice(0, s + START.length);
  const after = current.slice(e);
  const middle = body ? '\n' + body + '\n' : '\n';
  return before + middle + after;
}

function main() {
  const check = process.argv.includes('--check');
  const entries = collectEntries();
  let stale = false;
  let wrote = 0;

  for (const t of TARGETS) {
    if (!fs.existsSync(t.file)) {
      process.stderr.write(`warn: target ${path.relative(ROOT, t.file)} not found — skipping\n`);
      continue;
    }
    const current = fs.readFileSync(t.file, 'utf8');
    const body = entries.map((e) => lineFor(e, t.base)).join('\n');
    const next = render(current, body);
    if (next === null) {
      process.stderr.write(`error: markers ${START} / ${END} missing from ${path.relative(ROOT, t.file)}\n`);
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
    process.stdout.write(`catalog: up to date (${entries.length} team${entries.length === 1 ? '' : 's'})\n`);
  }
}

main();
