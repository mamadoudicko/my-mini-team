'use strict';
// Terminal UI helpers: colors, symbols, spinner, in-place repaint.

const isTTY = process.stdout.isTTY;

const c = (code) => (s) => isTTY ? `\x1b[${code}m${s}\x1b[0m` : String(s);
const C = {
  dim: c('2'), bold: c('1'),
  green: c('32'), cyan: c('36'), yellow: c('33'),
  blue: c('34'), magenta: c('35'), red: c('31'), gray: c('90'),
};

const SYM = {
  done: C.green('✔'),
  run: (f) => C.cyan(f),
  todo: C.gray('○'),
  arrow: C.dim('→'),
  loopMark: C.magenta('⟳'),
};

const SPIN = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Repaints a block of lines in place (cursor-based). Falls back to plain
// sequential printing when not a TTY.
class Painter {
  constructor() { this.prev = 0; }
  paint(lines) {
    if (!isTTY) return; // non-TTY handled by caller (sequential prints)
    let out = '';
    if (this.prev > 0) out += `\x1b[${this.prev}A`;
    out += '\x1b[0J';
    out += lines.join('\n') + '\n';
    process.stdout.write(out);
    this.prev = lines.length;
  }
  clear() { this.prev = 0; }
}

// Animated spinner for an async wait. Returns a stop() function.
function startSpinner(label) {
  if (!isTTY) { process.stdout.write('  ' + label + '\n'); return () => {}; }
  let i = 0;
  const id = setInterval(() => {
    process.stdout.write(`\r  ${C.cyan(SPIN[i++ % SPIN.length])} ${C.dim(label)}   `);
  }, 90);
  return () => { clearInterval(id); process.stdout.write('\r\x1b[0K'); };
}

module.exports = { C, SYM, SPIN, sleep, Painter, isTTY, startSpinner };
