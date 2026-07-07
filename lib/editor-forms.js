'use strict';
// Pure logic for the step-editor modal: the agent picker filter, the skill
// checkbox model, and the mapping from "what the user ticked" back to the
// minimal step-level `skills:` override. UI-agnostic and fully unit-testable.

const uniq = (a) => [...new Set(a)];
const setEq = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

// Given the agent's default skills and the DESIRED effective set the user
// ticked, compute the minimal step override:
//   null           → inherit  (desired === defaults)
//   ['+x', ...]     → additive (desired is defaults plus extras)
//   [x, ...] / []   → replace  (anything else; [] = "none")
function deriveSkillOverride(defaults, desired) {
  const d = uniq((defaults || []).map(String));
  const w = uniq((desired || []).map(String));
  if (setEq(w, d)) return null;
  if (d.length && d.every((x) => w.includes(x))) return w.filter((x) => !d.includes(x)).map((x) => '+' + x);
  return w.slice();
}

// Rows for the checkbox widget: agent defaults first, then other available
// skills. Each row says whether it's checked, a default, or a +added extra.
function skillRows(defaults, effective, available) {
  const d = new Set((defaults || []).map(String));
  const eff = new Set((effective || []).map(String));
  const order = uniq([...(defaults || []), ...(available || [])].map(String));
  return order.map((name) => ({
    name,
    checked: eff.has(name),
    isDefault: d.has(name),
    isAdded: eff.has(name) && !d.has(name),
  }));
}

// Toggle a skill name in a desired-set array (returns a new array).
function toggleSkill(desired, name) {
  const w = (desired || []).map(String);
  return w.includes(name) ? w.filter((x) => x !== name) : [...w, name];
}

// Case-insensitive substring filter over a list of strings (empty query → all).
function filterList(items, query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return (items || []).slice();
  return (items || []).filter((it) => String(it).toLowerCase().includes(q));
}

// Apply a keystroke to a text buffer: printable char appends, backspace deletes.
function applyChar(buffer, input, key) {
  const b = String(buffer || '');
  if (key && (key.backspace || key.delete)) return b.slice(0, -1);
  if (input && !(key && (key.ctrl || key.meta)) && input.length === 1 && input >= ' ') return b + input;
  return b;
}

module.exports = { deriveSkillOverride, skillRows, toggleSkill, filterList, applyChar };
