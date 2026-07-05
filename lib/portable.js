'use strict';
// Portable tokens: deterministic, copy-paste-safe encodings.
// Team formats:
//   mmt1: base64(yaml)                        team only
//   mmt2: base64(json {team, skills:[...]})    team + bundled skill definitions
// decode() always returns { yaml, skills:[{name, content}] }.
// Skill format:
//   mmts1: base64(json {v:1, name, content})  one standalone skill
// decodeSkill() returns { name, content }.

const YAML_PREFIX = 'mmt1:';
const BUNDLE_PREFIX = 'mmt2:';
const SKILL_PREFIX = 'mmts1:';

function encode(yamlText) {
  return YAML_PREFIX + Buffer.from(yamlText, 'utf8').toString('base64');
}

function encodeBundle(yamlText, skills) {
  const payload = JSON.stringify({ v: 2, team: yamlText, skills: skills || [] });
  return BUNDLE_PREFIX + Buffer.from(payload, 'utf8').toString('base64');
}

function isToken(s) {
  const t = String(s).trim();
  return t.startsWith(YAML_PREFIX) || t.startsWith(BUNDLE_PREFIX);
}

function decode(token) {
  const t = String(token).trim();
  if (t.startsWith(BUNDLE_PREFIX)) {
    const json = Buffer.from(t.slice(BUNDLE_PREFIX.length), 'base64').toString('utf8');
    const obj = JSON.parse(json);
    if (!obj.team || !/^team:/m.test(obj.team)) throw new Error('token did not decode to a team');
    return { yaml: obj.team, skills: Array.isArray(obj.skills) ? obj.skills : [] };
  }
  if (t.startsWith(YAML_PREFIX)) {
    const yamlText = Buffer.from(t.slice(YAML_PREFIX.length), 'base64').toString('utf8');
    if (!/^team:/m.test(yamlText)) throw new Error('token did not decode to a team');
    return { yaml: yamlText, skills: [] };
  }
  throw new Error('not a valid mmt export token');
}

// One standalone skill, deterministic and offline — mirrors the team codec.
function encodeSkill(name, content) {
  const payload = JSON.stringify({ v: 1, name, content });
  return SKILL_PREFIX + Buffer.from(payload, 'utf8').toString('base64');
}

function isSkillToken(s) {
  return String(s).trim().startsWith(SKILL_PREFIX);
}

function decodeSkill(token) {
  const t = String(token).trim();
  if (!t.startsWith(SKILL_PREFIX)) throw new Error('not a valid mmt skill token');
  const json = Buffer.from(t.slice(SKILL_PREFIX.length), 'base64').toString('utf8');
  const obj = JSON.parse(json);
  if (!obj.name || !obj.content) throw new Error('token did not decode to a skill');
  return { name: String(obj.name), content: String(obj.content) };
}

module.exports = {
  encode, encodeBundle, decode, isToken, YAML_PREFIX, BUNDLE_PREFIX,
  encodeSkill, decodeSkill, isSkillToken, SKILL_PREFIX,
};
