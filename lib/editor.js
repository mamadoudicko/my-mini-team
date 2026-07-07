'use strict';
// Pure step-list reducer for the team editor. Operates on the normalized team
// `steps` model (an array of member/loop nodes) and returns NEW arrays — never
// mutating the input — so a UI can keep undo history and re-render
// deterministically. UI-agnostic: the same engine backs any front-end.
//
// A path is a top-level index `i` (number) or `[i, j]` for the j-th inner step
// of the loop at top-level index `i`. Loops do not nest (matches the runtime).

function member(overrides = {}) {
  return {
    type: 'member',
    uses: overrides.uses || null,
    member: overrides.member || overrides.uses || 'member',
    does: overrides.does || '',
    skills: overrides.skills == null ? null : overrides.skills,
    model: overrides.model || '',
  };
}

function loop(steps, opts = {}) {
  return {
    type: 'loop',
    until: opts.until || 'the reviewer approves',
    max_rounds: opts.max_rounds || 3,
    steps: steps.slice(),
  };
}

const asArr = (p) => (Array.isArray(p) ? p : [p]);

// The step at a path, or undefined.
function stepAt(steps, path) {
  const [i, j] = asArr(path);
  if (j == null) return steps[i];
  const n = steps[i];
  return n && n.type === 'loop' ? n.steps[j] : undefined;
}

// Insert a member/loop at a top-level index (clamped to [0, len]).
function addStep(steps, index, step) {
  const i = Math.max(0, Math.min(steps.length, index));
  return [...steps.slice(0, i), step, ...steps.slice(i)];
}

// Insert a member into the loop at top index `loopIndex`, at `innerIndex`.
function addInner(steps, loopIndex, innerIndex, step) {
  const n = steps[loopIndex];
  if (!n || n.type !== 'loop') throw new Error('addInner: not a loop at ' + loopIndex);
  const j = Math.max(0, Math.min(n.steps.length, innerIndex));
  const inner = [...n.steps.slice(0, j), step, ...n.steps.slice(j)];
  return steps.map((s, k) => (k === loopIndex ? { ...n, steps: inner } : s));
}

// Remove the step at path. If an inner removal empties its loop, drop the loop.
function removeAt(steps, path) {
  const [i, j] = asArr(path);
  if (j == null) return steps.filter((_, k) => k !== i);
  const n = steps[i];
  if (!n || n.type !== 'loop') return steps;
  const inner = n.steps.filter((_, k) => k !== j);
  if (!inner.length) return steps.filter((_, k) => k !== i); // empty loop → drop it
  return steps.map((s, k) => (k === i ? { ...n, steps: inner } : s));
}

// Move a step up (-1) or down (+1) within its sibling list. Clamps (no wrap).
function move(steps, path, dir) {
  const [i, j] = asArr(path);
  const swap = (arr, a, b) => { const c = arr.slice(); [c[a], c[b]] = [c[b], c[a]]; return c; };
  if (j == null) {
    const t = i + dir;
    if (t < 0 || t >= steps.length) return steps;
    return swap(steps, i, t);
  }
  const n = steps[i];
  if (!n || n.type !== 'loop') return steps;
  const t = j + dir;
  if (t < 0 || t >= n.steps.length) return steps;
  return steps.map((s, k) => (k === i ? { ...n, steps: swap(n.steps, j, t) } : s));
}

// Wrap top-level members [start..end] into a single loop. Throws if the range
// is out of bounds or includes a loop (no nesting).
function wrapInLoop(steps, start, end, opts = {}) {
  const a = Math.min(start, end), b = Math.max(start, end);
  if (a < 0 || b >= steps.length) throw new Error('wrapInLoop: range out of bounds');
  const range = steps.slice(a, b + 1);
  if (range.some((s) => s.type === 'loop')) throw new Error('wrapInLoop: cannot nest a loop');
  return [...steps.slice(0, a), loop(range, opts), ...steps.slice(b + 1)];
}

// Replace the loop at top index with its inner members, spliced in place.
function unwrap(steps, index) {
  const n = steps[index];
  if (!n || n.type !== 'loop') return steps;
  return [...steps.slice(0, index), ...n.steps, ...steps.slice(index + 1)];
}

// Shallow-merge a patch into the step at path.
function update(steps, path, patch) {
  const [i, j] = asArr(path);
  if (j == null) return steps.map((s, k) => (k === i ? { ...s, ...patch } : s));
  const n = steps[i];
  if (!n || n.type !== 'loop') return steps;
  return steps.map((s, k) =>
    (k === i ? { ...n, steps: n.steps.map((m, l) => (l === j ? { ...m, ...patch } : m)) } : s));
}

module.exports = { member, loop, stepAt, addStep, addInner, removeAt, move, wrapInLoop, unwrap, update };
