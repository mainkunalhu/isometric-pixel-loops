'use strict';
// Isometric pixel loop renderer: orthographic 30-degree camera, depth buffer,
// hue-shifted ramps, ordered dither, long violet shadows. Timeline-only, no input.
// A loop page sets window.PP_LOOP before loading this file, then draws through these globals.
const LOOP_CFG = window.PP_LOOP || {};
const W = 360, H = 280, S = 10;
const SIN = 0.5, COS = Math.sqrt(3) / 2, R2 = Math.SQRT2;
const TAU = Math.PI * 2;
const OX = W / 2, OY = H / 2 + (LOOP_CFG.originY || 0);
const SHADOW_X = LOOP_CFG.shadowX == null ? 1.3 : LOOP_CFG.shadowX;
const SHADOW_Y = LOOP_CFG.shadowY == null ? -0.12 : LOOP_CFG.shadowY;
const LOOP_LEN = LOOP_CFG.loopLen || 8;
const GRADIENT_Y = COS / (S * SIN), EDGE = 0.28;

const canvas = document.getElementById('c');
canvas.width = W; canvas.height = H;
const ctx = canvas.getContext('2d');
const image = ctx.createImageData(W, H);
const pix = new Uint32Array(image.data.buffer);
const zb = new Float32Array(W * H);
const bakedPix = new Uint32Array(W * H);
const bakedZ = new Float32Array(W * H);
const ground = new Uint8Array(W * H);
const shadowMask = new Uint8Array(W * H);
const groundZ = new Float32Array(W * H);
const staticShadow = new Uint8Array(W * H);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const COOL = [46, 38, 84], WARM = [255, 232, 180];
const SHOE = [226, 222, 212], BARK = [92, 74, 60];
const GRASS = [[34, 62, 50], [52, 88, 52], [82, 118, 54], [124, 146, 62], [168, 172, 76]];

const KIND_NONE = 0, KIND_GRASS = 3;
const kinds = new Uint8Array(W * H);

const WIND_FPS = 8; // stepped on purpose: sway feels hand-animated, not simulated
const STILL = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const rgb = (r, g, b) => (255 << 24 | Math.min(255, b | 0) << 16 | Math.min(255, g | 0) << 8 | Math.min(255, r | 0)) >>> 0;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);

const ramps = new Map();
function rampOf(c) {
  const key = c.join(',');
  let ramp = ramps.get(key);
  if (ramp) return ramp;
  const mix = (m, tint, k) => rgb(lerp(c[0] * m, tint[0], k), lerp(c[1] * m, tint[1], k), lerp(c[2] * m, tint[2], k));
  ramp = [mix(0.4, COOL, 0.34), mix(0.62, COOL, 0.18), mix(0.84, COOL, 0.05), mix(1, WARM, 0), mix(1.1, WARM, 0.22)];
  ramps.set(key, ramp);
  return ramp;
}

const bayerAt = (ix, iy) => BAYER[(iy & 3) * 4 + (ix & 3)];

function tint(i, r, g, b) {
  const c = pix[i];
  pix[i] = rgb((c & 255) * r, (c >> 8 & 255) * g, (c >> 16 & 255) * b);
}

function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = ease(x - ix), fy = ease(y - iy);
  return lerp(lerp(hash(ix, iy), hash(ix + 1, iy), fx), lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), fx), fy);
}

function project(x, y, z) {
  const u = (x - y) / R2, v = (x + y) / R2;
  return { sx: OX + u * S, sy: OY + (v * SIN - z * COS) * S, d: v * COS + z * SIN };
}

function unproject(sx, sy) {
  const u = (sx - OX) / S, v = (sy - OY) / (S * SIN);
  return { x: (u + v) / R2, y: (v - u) / R2 };
}

// Seamless loop helpers: every motion must be a closed function of loopT.
function loopAngle(time, offset = 0) {
  return ((time % LOOP_LEN) / LOOP_LEN) * TAU + offset;
}
function windTime(time) {
  return STILL ? 0 : Math.floor(time * WIND_FPS) / WIND_FPS;
}
function loopSin(time, offset = 0) {
  return Math.sin(loopAngle(time, offset));
}

let capture = null;
function sphere(x, y, z, r, c, mode) {
  const ramp = rampOf(c);
  const p = project(x, y, z), rp = Math.max(r * S, 0.75);
  const y0 = Math.max(0, Math.floor(p.sy - rp)), y1 = Math.min(H - 1, Math.ceil(p.sy + rp));
  const x0 = Math.max(0, Math.floor(p.sx - rp)), x1 = Math.min(W - 1, Math.ceil(p.sx + rp));
  for (let iy = y0; iy <= y1; iy++) for (let ix = x0; ix <= x1; ix++) {
    const dx = (ix + 0.5 - p.sx) / rp, dy = (iy + 0.5 - p.sy) / rp, nn = dx * dx + dy * dy;
    if (nn > 1) continue;
    const nz = Math.sqrt(1 - nn), d = p.d + r * nz, i = iy * W + ix;
    if (d <= zb[i]) continue;
    let l = clamp(-0.55 * dx - 0.6 * dy + 0.58 * nz, 0, 1);
    if (mode === 'rough') l += (hash(ix, iy) - 0.5) * 0.55;
    if (dy > 0.35) l = Math.max(l, 0.12 + dy * 0.24);
    if (capture) {
      capture.push(ix, iy, d, ramp[clamp(Math.floor(l * 4.4 + 0.2 + (bayerAt(ix, iy) - 0.5) * 0.7), 0, 4)]);
      continue;
    }
    zb[i] = d;
    if (mode === 'gloss' && l > 0.9) { pix[i] = rgb(255, 250, 232); continue; }
    if (mode === 'solid') { pix[i] = ramp[clamp(Math.floor(l * 4.4 + 0.2), 1, 4)]; continue; }
    pix[i] = ramp[clamp(Math.floor(l * 4.4 + 0.2 + (bayerAt(ix, iy) - 0.5) * 0.7), 0, 4)];
  }
}

function capsule(a, b, r0, r1, colorOf, mode) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const n = Math.max(1, Math.ceil(len / (Math.min(r0, r1) * 0.45)));
  for (let k = 0; k <= n; k++) {
    const t = k / n, z = lerp(a[2], b[2], t);
    sphere(lerp(a[0], b[0], t), lerp(a[1], b[1], t), z, lerp(r0, r1, t), colorOf(z), mode);
  }
}

function box(x0, y0, z0, x1, y1, z1, c, seed = 0) {
  const ramp = rampOf(c);
  const paint = (x, y, z, base, grain) => {
    const p = project(x, y, z), ix = p.sx | 0, iy = p.sy | 0;
    if (ix < 0 || iy < 0 || ix >= W || iy >= H) return;
    const i = iy * W + ix;
    if (p.d <= zb[i]) return;
    zb[i] = p.d;
    pix[i] = ramp[clamp(Math.floor(base + (grain - 0.5) * 1.3 + (bayerAt(ix, iy) - 0.5) * 0.5), 0, 4)];
  };
  const step = 0.045, longX = x1 - x0 >= y1 - y0;
  for (let a = x0; a <= x1; a += step) for (let b = y0; b <= y1; b += step) {
    paint(a, b, z1, 3.4, longX ? noise(a * 0.8 + seed, b * 9) : noise(a * 9, b * 0.8 + seed));
  }
  for (let a = x0; a <= x1; a += step) for (let b = z0; b <= z1; b += step) paint(a, y1, b, 2.3, noise(a * 0.8 + seed, b * 9));
  for (let a = y0; a <= y1; a += step) for (let b = z0; b <= z1; b += step) paint(x1, a, b, 1.2, noise(a * 0.8 + seed, b * 9));
}

function plot(x, y, z, color) {
  const p = project(x, y, z), ix = p.sx | 0, iy = p.sy | 0;
  if (ix < 0 || iy < 0 || ix >= W || iy >= H) return;
  const i = iy * W + ix;
  if (p.d <= zb[i]) return;
  zb[i] = p.d;
  pix[i] = color;
}

function castShadow(x, y, z, r, strength = 1, dither = 0.4) {
  const p = project(x + SHADOW_X * z, y + SHADOW_Y * z, 0);
  const rx = r * S * 1.05, ry = rx * SIN + 1;
  const y0 = Math.max(0, Math.floor(p.sy - ry)), y1 = Math.min(H - 1, Math.ceil(p.sy + ry));
  const x0 = Math.max(0, Math.floor(p.sx - rx)), x1 = Math.min(W - 1, Math.ceil(p.sx + rx));
  for (let iy = y0; iy <= y1; iy++) for (let ix = x0; ix <= x1; ix++) {
    const dx = (ix + 0.5 - p.sx) / rx, dy = (iy + 0.5 - p.sy) / ry;
    if (dx * dx + dy * dy + (bayerAt(ix, iy) - 0.5) * dither > 1) continue;
    const i = iy * W + ix;
    if (shadowMask[i] < strength) shadowMask[i] = strength;
  }
}

function applyShadows(refZ) {
  for (let i = 0; i < pix.length; i++) {
    const s = shadowMask[i];
    if (!s) continue;
    shadowMask[i] = 0;
    if (!ground[i] || zb[i] !== refZ[i]) continue;
    if (s === 1) tint(i, 0.54, 0.52, 0.72);
    else tint(i, 0.36, 0.34, 0.56);
  }
}

function shadeEdges() {
  for (let iy = 1; iy < H - 1; iy++) for (let ix = 1; ix < W - 1; ix++) {
    const i = iy * W + ix, d = zb[i];
    if (d < -1e8 || d === groundZ[i]) continue;
    const a = i - W, b = i + W, c = i - 1, e = i + 1;
    if (zb[a] === groundZ[a] || zb[b] === groundZ[b] || zb[c] === groundZ[c] || zb[e] === groundZ[e]) {
      tint(i, 0.68, 0.66, 0.76);
    } else if (d - zb[a] - GRADIENT_Y > EDGE || d - zb[c] > EDGE) {
      const p = pix[i];
      pix[i] = rgb(lerp(p & 255, WARM[0], 0.3), lerp(p >> 8 & 255, WARM[1], 0.3), lerp(p >> 16 & 255, WARM[2], 0.22));
    } else if (zb[e] - d > EDGE || zb[b] - GRADIENT_Y - d > EDGE) {
      tint(i, 0.74, 0.72, 0.82);
    }
  }
}

// ---------- wind ----------
const tufts = [], leaves = [];
const tuftLit = GRASS.map(c => rgb(...c));
const tuftDark = GRASS.map(c => rgb(c[0] * 0.54, c[1] * 0.52, c[2] * 0.72));

function growGrass() {
  for (let iy = 3; iy < H; iy++) for (let ix = 0; ix < W; ix++) {
    const i = iy * W + ix;
    if (kinds[i] !== KIND_GRASS || hash(ix * 3, iy * 5) > 0.17) continue;
    const height = 1 + (hash(ix, iy * 2) * 3 | 0);
    tufts.push({
      ix, iy, i, height,
      base: Math.round(noise(ix * 0.09, iy * 0.18) * 2.2),
      phase: ix * 0.11 + iy * 0.19 + hash(ix, iy) * 0.9,
      bloom: hash(ix * 7, iy) < 0.022 ? rgb(...(hash(ix, iy) > 0.5 ? [250, 246, 226] : [240, 200, 84])) : 0,
    });
  }
}

function drawTufts(t) {
  for (const tuft of tufts) {
    const gust = Math.sin(t * 0.8 + tuft.phase) + 0.5 * Math.sin(t * 2.1 + tuft.phase * 2.3);
    const colors = staticShadow[tuft.i] ? tuftDark : tuftLit;
    for (let k = 1; k <= tuft.height; k++) {
      const jx = tuft.ix + Math.round(gust * 0.95 * k / 3), jy = tuft.iy - k;
      if (jx < 0 || jx >= W) continue;
      const j = jy * W + jx;
      if ((kinds[j] !== KIND_GRASS && kinds[j] !== KIND_NONE) || zb[j] !== groundZ[j]) continue;
      pix[j] = tuft.bloom && k === tuft.height ? tuft.bloom : colors[clamp(tuft.base + k + (gust > 1 ? 1 : 0), 1, 4)];
    }
  }
}

function drawLeaves(t) {
  for (const leaf of leaves) {
    const reach = clamp((leaf.z - 2.5) / 3, 0.3, 1);
    const swayX = (Math.sin(t * 0.9 + leaf.x * 0.5 + leaf.z * 0.7) + 0.55 * Math.sin(t * 2.3 + leaf.k * 1.7)) * reach;
    const dx = Math.round(swayX * 0.9), dy = Math.round(Math.sin(t * 1.3 + leaf.y + leaf.k) * reach * 0.45);
    const px = leaf.pixels;
    for (let n = 0; n < px.length; n += 4) {
      const ix = px[n] + dx, iy = px[n + 1] + dy;
      if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
      const i = iy * W + ix;
      if (px[n + 2] <= zb[i]) continue;
      zb[i] = px[n + 2];
      pix[i] = px[n + 3];
    }
    if (leaf.k % 2 === 0) castShadow(leaf.x + swayX * 0.12, leaf.y, leaf.z, leaf.r);
  }
}

function bakeOcclusion() {
  const offsets = [];
  for (const r of [2, 4]) for (let k = 0; k < 8; k++) {
    offsets.push([Math.round(Math.cos(k * Math.PI / 4) * r), Math.round(Math.sin(k * Math.PI / 4) * r * 0.7)]);
  }
  for (let iy = 4; iy < H - 4; iy++) for (let ix = 4; ix < W - 4; ix++) {
    const i = iy * W + ix;
    if (!ground[i] || zb[i] !== groundZ[i]) continue;
    let hits = 0;
    for (const [ox, oy] of offsets) {
      const j = (iy + oy) * W + ix + ox;
      if (zb[j] !== groundZ[j]) hits++;
    }
    if (!hits) continue;
    if (hits >= 8) tint(i, 0.56, 0.54, 0.72);
    else if (hits / 8 > bayerAt(ix, iy)) tint(i, 0.74, 0.72, 0.84);
  }
}

const CROWN = [[0.1, 0, 3.7, 1.6], [-1.4, -0.7, 3.3, 1.2], [1.6, 0.7, 3.4, 1.25], [-0.6, 1.1, 3.9, 1.1], [0.9, -1.1, 4, 1.1], [0.2, 0.1, 4.9, 1.05]];
const LEAF_DEEP = [58, 84, 62], LEAF_MID = [100, 126, 78], LEAF_SILVER = [146, 162, 112];

function growTree(x, y, scale = 1, count = 420, seed = 0) {
  const bark = () => BARK;
  capsule([x, y, 0], [x + 0.3 * scale, y + 0.1 * scale, 2.2 * scale], 0.36 * scale, 0.22 * scale, bark, 'rough');
  capsule([x + 0.3 * scale, y + 0.1 * scale, 2.2 * scale], [x - 0.8 * scale, y - 0.4 * scale, 3.3 * scale], 0.2 * scale, 0.13 * scale, bark, 'rough');
  capsule([x + 0.3 * scale, y + 0.1 * scale, 2.2 * scale], [x + 1.2 * scale, y + 0.4 * scale, 3.4 * scale], 0.2 * scale, 0.13 * scale, bark, 'rough');
  for (let n = 0; n < count; n++) {
    const k = n + seed, [cx, cy, cz, spread] = CROWN[n % CROWN.length];
    const a = hash(k, 7) * 6.283, tilt = hash(k, 8) * 2 - 1, d = Math.cbrt(hash(k, 9)) * spread, flat = Math.sqrt(1 - tilt * tilt);
    const rx = cx + Math.cos(a) * flat * d, ry = cy + Math.sin(a) * flat * d, rz = cz + tilt * d * 0.8;
    const tone = hash(k, 10) + (rz - 4.2) * 0.22 + (d / spread - 0.5) * 0.3;
    const leaf = tone > 0.72 ? LEAF_SILVER : tone > 0.3 ? LEAF_MID : LEAF_DEEP;
    capture = [];
    sphere(x + rx * scale, y + ry * scale, rz * scale, (0.2 + hash(k, 11) * 0.22) * scale, leaf, 'rough');
    leaves.push({ x: x + rx * scale, y: y + ry * scale, z: rz * scale, k, r: 0.42 * scale, pixels: capture });
    capture = null;
  }
}

// Articulated humanoid. pose: {z, scale, crouch, lean, stance, armR, armL}. Returns right-hand pos.
function figure(px, py, yaw, pose, palette, addBone) {
  const fx = Math.cos(yaw), fy = Math.sin(yaw), sx = -fy, sy = fx, base = pose.z || 0, k = pose.scale || 1;
  const P = (a, b, c) => [px + (fx * a + sx * b) * k, py + (fy * a + sy * b) * k, c * k + base];
  const add = (a, b, r0, r1, f) => addBone(a, b, r0 * k, r1 * k, f);
  const t = palette;
  const shirt = () => t.shirt;
  const legs = () => t.legs, skin = () => t.skin;
  const crouch = pose.crouch || 0, lean = pose.lean || 0;
  const hipZ = 1.28 - crouch * 0.4;
  const hipA = -crouch * 0.15;
  const shA = hipA + Math.sin(lean) * 0.95, shZ = hipZ + Math.cos(lean) * 0.95;
  const neck = P(shA, 0, shZ + 0.08), head = P(shA + Math.sin(lean) * 0.32, 0, shZ + 0.36);
  const stance = pose.stance == null ? 0.2 : pose.stance;
  const footB = P(-stance * 1.2, 0.2, 0.12), footF = P(stance * 2, -0.2, 0.12);
  const kneeB = P(-stance * 0.4 + crouch * 0.12, 0.22, 0.68 - crouch * 0.1);
  const kneeF = P(stance * 1.2 + crouch * 0.34, -0.22, 0.72 - crouch * 0.08);
  const hipB = P(hipA, 0.15, hipZ), hipF = P(hipA, -0.15, hipZ);
  add(hipB, kneeB, 0.17, 0.13, legs); add(kneeB, footB, 0.13, 0.1, legs);
  add(hipF, kneeF, 0.17, 0.13, legs); add(kneeF, footF, 0.13, 0.1, legs);
  add(footB, P(-stance * 1.2 + 0.16, 0.2, 0.08), 0.1, 0.09, () => SHOE);
  add(footF, P(stance * 2 + 0.16, -0.2, 0.08), 0.1, 0.09, () => SHOE);
  add(P(hipA, 0, hipZ), neck, 0.3, 0.32, shirt);
  add(neck, head, 0.11, 0.12, skin);
  add(head, head, 0.24, 0.24, skin);
  add([head[0] - fx * 0.06, head[1] - fy * 0.06, head[2] + 0.08], [head[0] - fx * 0.06, head[1] - fy * 0.06, head[2] + 0.08], 0.205, 0.205, () => t.hair);
  const shR = P(shA, 0.36, shZ - 0.03), shL = P(shA, -0.36, shZ - 0.03);
  const armR = pose.armR == null ? 0 : pose.armR, armL = pose.armL == null ? 0.08 : pose.armL;
  const elbowR = P(shA + Math.sin(armR) * 0.46, 0.4, shZ - 0.03 - Math.cos(armR) * 0.46);
  const handR = P(shA + Math.sin(armR + 0.18) * 0.95, 0.42, shZ - 0.03 - Math.cos(armR + 0.18) * 0.95);
  const elbowL = P(shA + Math.sin(armL) * 0.46, -0.42, shZ - 0.03 - Math.cos(armL) * 0.46);
  const handL = P(shA + Math.sin(armL + 0.2) * 0.9, -0.43, shZ - 0.03 - Math.cos(armL + 0.2) * 0.9);
  add(shR, elbowR, 0.12, 0.1, shirt); add(elbowR, handR, 0.09, 0.08, skin);
  add(shL, elbowL, 0.12, 0.1, shirt); add(elbowL, handL, 0.09, 0.08, skin);
  return handR;
}

const pendingShadows = [];
const dynamicAdd = (a, b, r0, r1, f) => { capsule(a, b, r0, r1, f, 'solid'); pendingShadows.push(a, r0, b, r1); };

function flushShadows() {
  for (let i = 0; i < pendingShadows.length; i += 4) {
    const a = pendingShadows[i], ra = pendingShadows[i + 1], c = pendingShadows[i + 2];
    const n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]) / 0.25));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      castShadow(lerp(a[0], c[0], t), lerp(a[1], c[1], t), lerp(a[2], c[2], t), ra * 0.9, 1, 0);
    }
    if (a[2] < 0.25) castShadow(a[0], a[1], 0, 0.2, 2, 0);
  }
}

function drawDots(points, color) {
  for (const [sx, sy] of points) {
    const ix = sx | 0, iy = sy | 0;
    if (ix >= 0 && iy >= 0 && ix < W && iy < H) pix[iy * W + ix] = color;
  }
}

function fit() {
  const dpr = window.devicePixelRatio || 1;
  const fitScale = Math.min(window.innerWidth / W, (window.innerHeight - 40) / H);
  const scale = Math.max(1, Math.floor(fitScale * dpr)) / dpr;
  canvas.style.width = W * scale + 'px';
  canvas.style.height = H * scale + 'px';
}

// ---------- v1.1: walk cycle, secondary motion, anime FX ----------
// Quantized 4-key gait. phase 0..1 around the loop. Returns a pose for figure().
// stance swings +/-swing, opposite arms ∓swing*armSwing, 2px foot lift baked
// into crouch so feet never slide: contact/pass/down/up are discrete, not eased.
function walkPose(t, opts = {}) {
  const { phase = 0, swing = 0.13, armSwing = 3, crouchBase = 0.06, leanBase = 0.08 } = opts;
  const k = ((t % LOOP_LEN) / LOOP_LEN + phase) % 1;
  const step = Math.floor(k * 4) % 4; // 0 contact, 1 pass, 2 down, 3 up
  const dir = step < 2 ? 1 : -1;
  const lift = step === 1 || step === 3 ? 0.05 : 0;
  return {
    stance: dir * swing,
    crouch: crouchBase + lift,
    lean: leanBase,
    armR: -dir * swing * armSwing,
    armL: dir * swing * armSwing,
    scale: opts.scale,
    z: opts.z,
  };
}

// Secondary motion lags one 8fps tick so hair/cloth trails the body seamlessly.
function lagAngle(t, ticks = 1) {
  return loopAngle(t - ticks / WIND_FPS, 0);
}

// Spiky anime hair: 5 rough spheres around the head top. Call after figure()
// using the head center; keeps silhouette readable at 5px+.
function spikyHair(hx, hy, hz, color, s = 1) {
  const spikes = [[0, 0, 0.16, 0.16], [-0.16, 0.08, 0.1, 0.11], [0.16, 0.08, 0.1, 0.11], [-0.08, -0.12, 0.12, 0.1], [0.08, -0.12, 0.12, 0.1]];
  for (const [dx, dy, dz, r] of spikes) sphere(hx + dx * s, hy + dy * s, hz + dz * s, r * s, color, 'rough');
}

// Headband: metal plate (gloss rect via 3 dots) + two tails rippling with lagAngle.
function headband(hx, hy, hz, t, plateColor = [200, 200, 210]) {
  const p = project(hx, hy, hz + 0.1);
  drawDots([[p.sx - 1, p.sy], [p.sx, p.sy], [p.sx + 1, p.sy]], rgb(...plateColor));
  const a = lagAngle(t);
  for (let k = 1; k <= 3; k++) {
    const sway = Math.sin(a * 2 + k * 0.9) * 0.12 * k;
    plot(hx - 0.2 - k * 0.12, hy - 0.1 + sway * 0.3, hz + 0.05 - k * 0.1 + sway * 0.1, rgb(60, 60, 120));
  }
}

// White halo under signal/glow dots so FX separate from busy detail.
function haloDots(points) {
  const halo = [];
  for (const [x, y] of points) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) halo.push([x + dx, y + dy]);
  drawDots(halo, rgb(255, 255, 255));
}

// Energy glow: pulsing ring + core, period-locked. color e.g. [120, 200, 255].
function glowDots(cx, cy, cz, t, color, baseR = 3, pulse = 4) {
  const rr = baseR + ((t % LOOP_LEN) / LOOP_LEN) * pulse;
  const p = project(cx, cy, cz);
  const ring = [];
  for (let k = 0; k < 20; k++) {
    if (hash(k, Math.floor(rr)) > 1 - (rr % 1) * 0.5) continue;
    const a = k / 20 * 6.283;
    ring.push([p.sx + Math.cos(a) * rr, p.sy + Math.sin(a) * rr * 0.5]);
  }
  haloDots(ring);
  drawDots(ring, rgb(...color));
  drawDots([[p.sx, p.sy]], rgb(255, 255, 255));
}

// Road crossing stripes inset in a road band (never floating bars): call in
// bake() after ground. cx,cy center, w length along x, stripes across.
function roadStripes(cx, cy, w, stripeW = 0.55, gap = 0.45, color = [225, 222, 214]) {
  const n = Math.floor(w / (stripeW + gap));
  for (let k = 0; k < n; k++) {
    const x0 = cx - w / 2 + k * (stripeW + gap);
    box(x0, cy - 0.9, 0.02, x0 + stripeW, cy + 0.9, 0.06, color, k * 7.3);
  }
}

// ---------- v2.0: any-subject kit ----------
const LOOP_KINDS = { NONE: 0, WATER: 1, SAND: 2, GRASS: 3, STONE: 4, SNOW: 5, MUD: 6, LAVA: 7, ROAD: 8 };
const PAL = {
  sand: [[196, 182, 150], [206, 193, 161], [215, 203, 172], [223, 212, 182]],
  stone: [[150, 148, 142], [162, 160, 152], [174, 172, 162], [186, 184, 172]],
  snow: [[228, 234, 240], [236, 240, 246], [244, 246, 250], [250, 250, 252]],
  mud: [[110, 88, 66], [122, 98, 74], [134, 108, 82], [146, 120, 92]],
  lava: [[200, 80, 30], [220, 110, 40], [240, 150, 60], [250, 200, 120]],
  road: [[80, 74, 82], [92, 86, 94], [104, 98, 106], [116, 110, 118]],
  pine: [36, 70, 52], palm: [70, 128, 62], bamboo: [96, 150, 80],
  trunk: [92, 74, 60], reed: [96, 118, 62],
};

// Conifer: stacked rough tiers, static (conifers barely sway at this scale).
function growPine(x, y, scale = 1, seed = 0, color = PAL.pine) {
  capsule([x, y, 0], [x, y, 1.6 * scale], 0.14 * scale, 0.1 * scale, () => PAL.trunk, 'rough');
  const tiers = [[2.6, 1.0], [2.0, 0.8], [1.4, 0.6]];
  tiers.forEach(([w, zz], ti) => {
    for (let k = 0; k < 10; k++) {
      const a = hash(k + seed, ti) * 6.283, d = Math.sqrt(hash(k, ti + seed)) * w * 0.5 * scale;
      sphere(x + Math.cos(a) * d, y + Math.sin(a) * d, (zz + 1.2) * scale, 0.28 * scale, color, 'rough');
    }
  });
  castShadow(x, y, 2 * scale, 0.9 * scale);
}

// Palm: curved banded trunk + 8 drooping fronds, tips captured for sway.
function growPalm(x, y, scale = 1, seed = 0, lean = 0.5) {
  const segs = 7;
  let px = x, py = y;
  for (let s2 = 1; s2 <= segs; s2++) {
    const t2 = s2 / segs, nx = x + lean * t2 * t2 * scale, nz = 2.6 * t2 * scale;
    capsule([px, py, (s2 - 1) / segs * 2.6 * scale], [nx, py, nz], 0.13 * scale, 0.1 * scale,
      z => (Math.floor(z * 4) % 2 ? [128, 104, 80] : [96, 76, 60]), 'rough');
    px = nx;
  }
  const top = [px, py, 2.6 * scale];
  for (let f = 0; f < 8; f++) {
    const a = f / 8 * 6.283 + seed;
    const tip = [top[0] + Math.cos(a) * 1.3 * scale, top[1] + Math.sin(a) * 1.3 * scale, top[2] - 0.7 * scale];
    capsule(top, tip, 0.07 * scale, 0.03 * scale, () => PAL.palm, 'rough');
    capture = [];
    sphere(tip[0], tip[1], tip[2], 0.16 * scale, PAL.palm, 'rough');
    leaves.push({ x: tip[0], y: tip[1], z: tip[2], k: f + seed, r: 0.3 * scale, pixels: capture });
    capture = null;
  }
  castShadow(x, y, 2 * scale, 0.7 * scale);
}

// Bamboo clump: 5-9 jointed verticals + captured leaf puffs.
function growBamboo(x, y, n = 7, scale = 1, seed = 0) {
  for (let k = 0; k < n; k++) {
    const bx = x + (hash(k, seed) - 0.5) * 1.6 * scale, by = y + (hash(k, seed + 1) - 0.5) * 1.6 * scale;
    const h = (2 + hash(k, seed + 2) * 1.5) * scale;
    capsule([bx, by, 0], [bx, by, h], 0.06 * scale, 0.045 * scale,
      z => (Math.floor(z * 5) % 2 ? [110, 160, 90] : PAL.bamboo), 'solid');
    if (k % 2 === 0) {
      capture = [];
      sphere(bx, by, h, 0.2 * scale, PAL.bamboo, 'rough');
      leaves.push({ x: bx, y: by, z: h, k: k + seed, r: 0.25 * scale, pixels: capture });
      capture = null;
    }
    castShadow(bx, by, h * 0.5, 0.12 * scale);
  }
}

function growBush(x, y, r = 0.5, color = [92, 128, 72], seed = 0) {
  for (let k = 0; k < 8; k++) {
    sphere(x + (hash(k, seed) - 0.5) * r * 2, y + (hash(k, seed + 1) - 0.5) * r * 2,
      r * (0.4 + hash(k, seed + 2) * 0.5), r * 0.45, color, 'rough');
  }
  castShadow(x, y, r, r * 1.4);
}

// Flowers: static colored dots on grass, baked. Returns count planted.
function growFlowers(cx, cy, rx, ry, n = 24, seed = 0, colors = [[240, 120, 130], [250, 240, 220], [240, 200, 84]]) {
  let planted = 0;
  for (let k = 0; k < n * 4 && planted < n; k++) {
    const x = cx + (hash(k, seed) - 0.5) * rx * 2, y = cy + (hash(k, seed + 1) - 0.5) * ry * 2;
    const p = project(x, y, 0.06), ix = p.sx | 0, iy = p.sy | 0;
    if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
    const i = iy * W + ix;
    if (kinds[i] !== KIND_GRASS) continue;
    plot(x, y, 0.06, colors[k % colors.length]);
    planted++;
  }
  return planted;
}

function growReeds(x, y, n = 8, seed = 0) {
  for (let k = 0; k < n; k++) {
    const rx = x + (hash(k, seed) - 0.5) * 2, ry = y + (hash(k, seed + 1) - 0.5) * 1;
    const h = 0.9 + hash(k, seed + 2) * 0.9, lean = (hash(k, seed + 3) - 0.5) * 0.3;
    capsule([rx, ry, 0], [rx + lean, ry, h], 0.06, 0.04, () => PAL.reed, 'solid');
    castShadow(rx + lean * 0.5, ry, h * 0.5, 0.08);
  }
}

// Directional flow field: makeFlow seeds streaks, drawFlow scrolls them.
// axis 'x' (river) or 'y' (current), span wraps with FLOW = span/LOOP_LEN.
function makeFlow({ x0 = -8, x1 = 8, y0 = -3, y1 = 3, speed = 2, count = 120, seed = 0 }) {
  const span = Math.max(x1 - x0, y1 - y0);
  const arr = [];
  for (let k = 0; k < count; k++) {
    arr.push({
      x: x0 + hash(k, seed) * (x1 - x0), y: y0 + hash(k, seed + 1) * (y1 - y0),
      len: 2 + (hash(k, seed + 2) * 3 | 0), bright: hash(k, seed + 3) > 0.72, wob: hash(k, seed + 4) * 6.28,
    });
  }
  return { arr, span, speed: span / LOOP_LEN, x0, x1, y0, y1 };
}
function drawFlow(t, flow, axis = 'x') {
  const lit = rgb(150, 208, 180), soft = rgb(104, 180, 158), dim = rgb(58, 112, 120);
  for (const s of flow.arr) {
    let fx = s.x, fy = s.y;
    if (axis === 'x') fx = ((s.x + t * flow.speed - flow.x0) % (flow.x1 - flow.x0) + (flow.x1 - flow.x0)) % (flow.x1 - flow.x0) + flow.x0;
    else fy = ((s.y + t * flow.speed - flow.y0) % (flow.y1 - flow.y0) + (flow.y1 - flow.y0)) % (flow.y1 - flow.y0) + flow.y0;
    const sway = Math.sin(fy * 0.7 + s.wob) * 0.3;
    for (let k = 0; k < s.len; k++) {
      const p = project(fx + sway, fy + k * 0.16, 0), ix = p.sx | 0, iy = p.sy | 0;
      if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
      const i = iy * W + ix;
      if (zb[i] !== groundZ[i]) continue;
      pix[i] = staticShadow[i] ? dim : s.bright ? lit : soft;
    }
  }
}

// Waterfall: vertical falling streaks + foam pool + mist. x,y face, top z, base z0.
function drawFall(x, y, zTop, zBase, t, width = 1.2, color = [200, 230, 235]) {
  const span = zTop - zBase, speed = span / LOOP_LEN;
  for (let k = 0; k < 60; k++) {
    const ox = (hash(k, 91) - 0.5) * width;
    const z = zBase + ((hash(k, 92) * span + t * speed) % span);
    const wob = Math.sin(z * 2 + k) * 0.05;
    plot(x + ox + wob, y, z, color);
  }
  for (let k = 0; k < 14; k++) { // foam ring, period-locked pulse
    const a = k / 14 * 6.283 + loopAngle(t) * 0.5;
    const rr = width * (0.7 + ((t % LOOP_LEN) / LOOP_LEN) * 0.5);
    plot(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.6, zBase + 0.05, [240, 248, 248]);
  }
}

// Birds: 2-dot gulls, 2-frame flap, wrap across the top. Petals/leaves: same idea lower.
function drawBirds(t, birds) {
  for (const b of birds) {
    const span = b.x1 - b.x0;
    const fx = ((b.x + t * span / LOOP_LEN - b.x0) % span + span) % span + b.x0;
    const flap = Math.floor(t * 2 + b.ph) % 2 === 0 ? 1 : 2;
    const p = project(fx, b.y, b.z);
    const c = rgb(60, 56, 60);
    if (flap === 1) drawDots([[p.sx - 2, p.sy], [p.sx + 2, p.sy]], c);
    else drawDots([[p.sx - 2, p.sy - 1], [p.sx, p.sy], [p.sx + 2, p.sy - 1]], c);
  }
}
function drawPetals(t, petals, color = [245, 200, 210]) {
  const c = rgb(...color);
  for (const p2 of petals) {
    const fy = ((p2.y0 + t * p2.span / LOOP_LEN) % p2.span + p2.span) % p2.span + p2.y1 - p2.span;
    const fx = p2.x + Math.sin(loopAngle(t, p2.ph)) * 0.8;
    const p = project(fx, fy, p2.z + Math.sin(loopAngle(t * 1.0, p2.ph)) * 0.2);
    drawDots([[p.sx, p.sy]], c);
  }
}

// Rain (diagonal, splash skip) and snow (slow drift). counts modest: 80/50.
function drawRain(t, drops) {
  const c = rgb(170, 190, 205);
  for (const d of drops) {
    const span = 14;
    const fy = d.y0 - ((t * span / LOOP_LEN + d.ph * span) % span);
    const fx = d.x + (d.y0 - fy) * 0.25;
    const p = project(fx, fy, d.z);
    drawDots([[p.sx, p.sy], [p.sx, p.sy + 1]], c);
  }
}
function drawSnow(t, flakes) {
  const c = rgb(245, 248, 252);
  for (const f of flakes) {
    const span = 12;
    const fy = f.y0 - ((t * span / LOOP_LEN * 0.4 + f.ph * span) % span);
    const fx = f.x + Math.sin(loopAngle(t, f.ph)) * 0.6;
    const p = project(fx, fy, f.z);
    drawDots([[p.sx, p.sy]], c);
  }
}

// Fire + smoke at (x,y,z): rising dots, period-locked.
function drawFire(t, x, y, z, size = 1) {
  const cols = [[255, 220, 130], [250, 150, 60], [230, 90, 40]];
  for (let k = 0; k < 16 * size; k++) {
    const rise = (hash(k, 77) + (t % LOOP_LEN) / LOOP_LEN) % 1;
    plot(x + Math.sin(k * 3 + rise * 5) * 0.2 * size, y + Math.cos(k * 2) * 0.15,
      z + rise * 1.2 * size, cols[k % 3]);
  }
}
function drawSmoke(t, x, y, z, size = 1) {
  for (let k = 0; k < 10 * size; k++) {
    const rise = (hash(k, 78) + (t % LOOP_LEN) / LOOP_LEN) % 1;
    if (hash(k, Math.floor(rise * 6)) > 1 - rise) continue;
    plot(x + rise * 0.8 * size, y + rise * 0.4, z + rise * 2 * size, [150, 148, 150]);
  }
}

// Quadruped dog. pose: {wag (loop phase fn or bool), barkBeat (-1 none, else 0..3), sit}.
function dog(px, py, yaw, pose, palette, addBone) {
  const fx = Math.cos(yaw), fy = Math.sin(yaw), sx = -fy, sy = fx;
  const P = (a, b, c) => [px + fx * a + sx * b, py + fy * a + sy * b, c];
  const barking = pose.barkBeat === Math.floor(((G_TIME() % LOOP_LEN) / LOOP_LEN) * 4);
  const bounce = barking ? 0.06 : 0;
  const L = pose.sit ? 0.5 : 0.7; // body length
  const bz = (pose.sit ? 0.55 : 0.5) + bounce;
  addBone(P(-L, 0.15, bz), P(L * 0.6, 0.15, bz + 0.05), 0.2, 0.18, () => palette.coat);
  addBone(P(-L, -0.15, bz), P(L * 0.6, -0.15, bz + 0.05), 0.2, 0.18, () => palette.coat);
  const legH = pose.sit ? 0.45 : 0.5;
  for (const [lx, lz2] of [[-L + 0.15, legH], [L * 0.4, legH]]) {
    for (const s2 of [0.15, -0.15]) {
      addBone(P(lx, s2, bz - 0.1), P(lx, s2, 0.08), 0.07, 0.06, () => palette.coat);
    }
  }
  const headZ = bz + 0.35 + (barking ? 0.12 : Math.sin(lagAngle(G_TIME())) * 0.02);
  const head = P(L * 0.6 + 0.25, 0, headZ);
  addBone(P(L * 0.6, 0, bz + 0.05), head, 0.12, 0.14, () => palette.coat);
  sphere(head[0], head[1], head[2], 0.2, palette.coat, 'solid');
  sphere(head[0] + fx * 0.18, head[1] + fy * 0.18, head[2] - 0.05, 0.09, palette.snout, 'solid'); // snout
  sphere(head[0] - fx * 0.05, head[1] - fy * 0.05, head[2] + 0.18, 0.06, palette.ear, 'solid'); // ears
  sphere(head[0] + fx * 0.02, head[1] + fy * 0.02, head[2] + 0.16, 0.055, palette.ear, 'solid');
  const wag = Math.sin(loopAngle(G_TIME(), 0)) * (pose.wag === false ? 0 : 0.15);
  addBone(P(-L - 0.15, 0, bz + 0.15), P(-L - 0.45, wag, bz + 0.35), 0.05, 0.03, () => palette.coat); // tail
  if (barking) { // 3 expanding rings from snout
    const sp = project(head[0] + fx * 0.3, head[1] + fy * 0.3, head[2]);
    const rr = 2 + ((G_TIME() % 2) / 2) * 4;
    const ring = [];
    for (let k = 0; k < 10; k++) {
      const a = k / 10 * 6.283;
      ring.push([sp.sx + Math.cos(a) * rr, sp.sy + Math.sin(a) * rr * 0.6]);
    }
    haloDots(ring);
    drawDots(ring, rgb(90, 86, 92));
  }
  return head;
}
// dog() time source: set by draw() each frame; defaults to 0 headless.
let _gt = 0;
function G_TIME() { return _gt; }
function setLoopTime(t) { _gt = t; }

// Frame-fill meter: island pixels % and bbox %. Call after draw().
// Measured refs: court 36%, dock 27%, stall 26%, juggler 14% (island px).
function measureFill() {
  const d = ctx.getImageData(0, 0, W, H).data;
  let n = 0, minx = W, maxx = 0, miny = H, maxy = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (d[i] < 235 || d[i + 1] < 235 || d[i + 2] < 235) {
      n++;
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
    }
  }
  const bw = maxx - minx + 1, bh = maxy - miny + 1;
  return { islandPct: +(n / (W * H) * 100).toFixed(1), bboxPct: +((bw * bh) / (W * H) * 100).toFixed(1) };
}
