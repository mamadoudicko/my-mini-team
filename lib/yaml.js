'use strict';
// Minimal, dependency-free YAML parser tuned for the mini-team schema.
// Supports: comments, nested maps, block lists (scalars + maps), inline flow
// lists [a, b], quoted strings, numbers, booleans, null. 2-space indentation.
// This is intentionally NOT a full YAML implementation — it covers exactly the
// subset team files use, and throws clearly on anything outside it.

function parse(src) {
  const lines = [];
  src.split(/\r?\n/).forEach((raw, i) => {
    // strip trailing comments that are not inside quotes
    let line = stripComment(raw);
    if (line.trim() === '') return;
    const indent = line.length - line.trimStart().length;
    if (indent % 2 !== 0) throw new Error(`Line ${i + 1}: indentation must be a multiple of 2 spaces`);
    lines.push({ indent, text: line.trim(), n: i + 1 });
  });
  const [value] = parseBlock(lines, 0, 0);
  return value ?? {};
}

function stripComment(line) {
  let out = '';
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      out += c;
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
      out += c;
    } else if (c === '#') {
      break;
    } else {
      out += c;
    }
  }
  return out.replace(/\s+$/, '');
}

// Returns [value, nextIndex]
function parseBlock(lines, start, indent) {
  if (start >= lines.length) return [null, start];
  const first = lines[start];
  if (first.indent < indent) return [null, start];
  if (first.text.startsWith('- ')) return parseList(lines, start, first.indent);
  if (first.text === '-') return parseList(lines, start, first.indent);
  return parseMap(lines, start, first.indent);
}

function parseMap(lines, start, indent) {
  const obj = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < indent) break;
    if (line.indent > indent) throw new Error(`Line ${line.n}: unexpected indentation`);
    if (line.text.startsWith('- ')) break;
    const idx = splitKey(line.text);
    if (idx === -1) throw new Error(`Line ${line.n}: expected "key: value"`);
    const key = unquote(line.text.slice(0, idx).trim());
    const rest = line.text.slice(idx + 1).trim();
    if (rest === '') {
      const [child, next] = parseBlock(lines, i + 1, indent + 2);
      obj[key] = child;
      i = next;
    } else {
      obj[key] = scalar(rest);
      i++;
    }
  }
  return [obj, i];
}

function parseList(lines, start, indent) {
  const arr = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < indent) break;
    if (line.indent > indent) throw new Error(`Line ${line.n}: unexpected indentation in list`);
    if (!line.text.startsWith('-')) break;
    const after = line.text.slice(1).trim();
    if (after === '') {
      const [child, next] = parseBlock(lines, i + 1, indent + 2);
      arr.push(child);
      i = next;
    } else if (splitKey(after) !== -1) {
      // inline map on the dash line: "- key: value" — reparse as a mini-map
      const synthetic = [{ indent: indent + 2, text: after, n: line.n }];
      // collect following deeper lines belonging to this item
      let j = i + 1;
      while (j < lines.length && lines[j].indent >= indent + 2) {
        synthetic.push({ ...lines[j] });
        j++;
      }
      const [child] = parseMap(normalizeIndent(synthetic, indent + 2), 0, indent + 2);
      arr.push(child);
      i = j;
    } else {
      arr.push(scalar(after));
      i++;
    }
  }
  return [arr, i];
}

function normalizeIndent(lines) {
  return lines; // indents already absolute; parseMap uses provided indent
}

function splitKey(text) {
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === ':' && (i + 1 >= text.length || text[i + 1] === ' ')) {
      return i;
    }
  }
  return -1;
}

function scalar(raw) {
  const v = raw.trim();
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (inner === '') return [];
    return splitFlow(inner).map(scalar);
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~' || v === '') return null;
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if (/^-?\d*\.\d+$/.test(v)) return parseFloat(v);
  return unquote(v);
}

function splitFlow(inner) {
  const parts = [];
  let depth = 0, quote = null, cur = '';
  for (const c of inner) {
    if (quote) {
      cur += c;
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c; cur += c;
    } else if (c === '[') { depth++; cur += c; }
    else if (c === ']') { depth--; cur += c; }
    else if (c === ',' && depth === 0) { parts.push(cur); cur = ''; }
    else cur += c;
  }
  if (cur.trim() !== '') parts.push(cur);
  return parts;
}

function unquote(v) {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

module.exports = { parse };
