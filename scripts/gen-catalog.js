#!/usr/bin/env node
'use strict';
// Regenerate the README "## Catalog" section from catalog/<user>/<team>/ dirs.
// Zero deps, Node 18+. Reuses lib/yaml + lib/model so the index can't drift
// from what mmt actually reads.
//
//   node scripts/gen-catalog.js          # rewrite README if the section is stale
//   node scripts/gen-catalog.js --check  # write nothing; exit non-zero if stale/broken

const fs = require('fs');
const path = require('path');
const yaml = require('../lib/yaml');
const { normalizeTeam, teamSkills } = require('../lib/model');

const ROOT = path.join(__dirname, '..');
const CATALOG = path.join(ROOT, 'catalog');
const README = path.join(ROOT, 'README.md');
const START = '<!-- mmt:catalog:start -->';
const END = '<!-- mmt:catalog:end -->';

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
      // Reuse the model for validation, even though skills aren't rendered.
      teamSkills(team);
      const desc = team.about || team.team;
      entries.push({ user, team: teamDir, line: `- [${user}/${teamDir}](catalog/${user}/${teamDir}/) — ${desc}` });
    }
  }
  entries.sort((a, b) => (a.user === b.user ? a.team.localeCompare(b.team) : a.user.localeCompare(b.user)));
  return entries;
}

// Return the full README text with the marked region replaced, or null if the
// markers are missing.
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
  const current = fs.readFileSync(README, 'utf8');
  const entries = collectEntries();
  const body = entries.map((e) => e.line).join('\n');
  const next = render(current, body);

  if (next === null) {
    process.stderr.write(`error: markers ${START} / ${END} missing from README.md\n`);
    process.exit(1);
  }

  if (check) {
    if (next === current) {
      process.exit(0);
    }
    process.stderr.write('error: README catalog section is stale — run `npm run catalog`\n');
    process.exit(1);
  }

  if (next === current) {
    process.stdout.write(`catalog: up to date (${entries.length} team${entries.length === 1 ? '' : 's'})\n`);
    return;
  }
  fs.writeFileSync(README, next);
  process.stdout.write(`catalog: wrote README.md (${entries.length} team${entries.length === 1 ? '' : 's'})\n`);
}

main();
