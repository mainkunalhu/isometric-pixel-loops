#!/usr/bin/env node
// check-loop.mjs: validate an isometric-pixel-loops page. Usage: node scripts/check-loop.mjs <index.html> [engine-loop.js]
import fs from 'node:fs';

const [htmlPath, enginePath] = process.argv.slice(2);
if (!htmlPath) {
  console.error('usage: node scripts/check-loop.mjs <index.html> [engine-loop.js]');
  process.exit(2);
}
const fail = [];
const warn = [];
const html = fs.readFileSync(htmlPath, 'utf8');
const must = (re, msg) => { if (!re.test(html)) fail.push(msg); };
const mustNot = (re, msg) => { if (re.test(html)) fail.push(msg); };

// 1. loop config
must(/window\.PP_LOOP\s*=/, 'missing window.PP_LOOP config');
must(/loopLen\s*:\s*[6-9]|loopLen\s*:\s*10/, 'PP_LOOP.loopLen should be 6-10s (default 8)');
must(/window\.__loop\s*=/, 'missing window.__loop test hook { G, LOOP_LEN, step }');
must(/function\s+bake\s*\(/, 'missing bake()');
must(/function\s+draw\s*\(/, 'missing draw()');
must(/pix\.set\(bakedPix\)/, 'draw() must restore pix.set(bakedPix)');
must(/pendingShadows\.length\s*=\s*0/, 'draw() must clear pendingShadows');
must(/windTime\s*\(/, 'ambient must ride windTime() (stepped 8fps)');
must(/loopAngle|loopSin|%\s*LOOP_LEN/, 'actor motion must wrap: use loopAngle/loopSin or % LOOP_LEN');
must(/flushShadows\(\)/, 'missing flushShadows()');
must(/applyShadows\(/, 'missing applyShadows()');
must(/shadeEdges\(\)/, 'missing shadeEdges()');
must(/putImageData/, 'missing ctx.putImageData');
must(/requestAnimationFrame/, 'missing rAF loop');

// 2. no game systems in a loop
mustNot(/localStorage/, 'loops must not use localStorage (game persistence)');
mustNot(/aria-live="polite".*score|id="score"/, 'loops must not ship a game score HUD');
mustNot(/keydown.*Space|pointerdown.*press\(\)/s, 'loops must not wire press/release gameplay input');
if (/AudioContext|new Audio/.test(html)) warn.push('audio in a loop: keep it optional and off by default');

if (enginePath) {
  const eng = fs.readFileSync(enginePath, 'utf8');
  if (!/const\s+LOOP_LEN/.test(eng)) fail.push('engine-loop.js must export LOOP_LEN');
  if (!/function\s+windTime/.test(eng)) fail.push('engine-loop.js must define windTime()');
  if (!/function\s+loopAngle/.test(eng)) fail.push('engine-loop.js must define loopAngle()');
}

console.log(`check ${htmlPath}: ${fail.length} errors, ${warn.length} warnings`);
for (const w of warn) console.log(`WARN: ${w}`);
for (const f of fail) console.log(`FAIL: ${f}`);
process.exit(fail.length ? 1 : 0);
