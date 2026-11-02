// pixel.js — worker-safe pure core of the loop renderer (no DOM, no canvas).
// Mirrors the math in engine-loop.js so heavy bakes (ray-marched frames,
// city towers, sign masks) can run in a Web Worker and post buffers back.
// Load before engine-loop.js, or import the same file inside a worker.
const TAU = Math.PI * 2;
const SIN = 0.5, COS = Math.sqrt(3) / 2, R2 = Math.SQRT2;

const rgb = (r, g, b) => (255 << 24 | Math.min(255, b | 0) << 16 | Math.min(255, g | 0) << 8 | Math.min(255, r | 0)) >>> 0;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const bayerAt = (ix, iy) => BAYER[(iy & 3) * 4 + (ix & 3)];
const COOL = [46, 38, 84], WARM = [255, 232, 180];

function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = ease(x - ix), fy = ease(y - iy);
  return lerp(lerp(hash(ix, iy), hash(ix + 1, iy), fx), lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), fx), fy);
}

// View-parameterized projection (engine-loop.js uses W/H/S globals; workers use this).
function makeView({ w, h, s, originY = 0 }) {
  const OX = w / 2, OY = h / 2 + originY;
  const project = (x, y, z) => {
    const u = (x - y) / R2, v = (x + y) / R2;
    return { sx: OX + u * s, sy: OY + (v * SIN - z * COS) * s, d: v * COS + z * SIN };
  };
  const unproject = (sx, sy) => {
    const u = (sx - OX) / s, v = (sy - OY) / (s * SIN);
    return { x: (u + v) / R2, y: (v - u) / R2 };
  };
  return { w, h, s, OX, OY, project, unproject };
}

function rampOf(c) {
  const mix = (m, tint, k) => rgb(lerp(c[0] * m, tint[0], k), lerp(c[1] * m, tint[1], k), lerp(c[2] * m, tint[2], k));
  return [mix(0.4, COOL, 0.34), mix(0.62, COOL, 0.18), mix(0.84, COOL, 0.05), mix(1, WARM, 0), mix(1.1, WARM, 0.22)];
}

// Seamless loop helpers (LOOP_LEN supplied by the page).
function loopAngle(time, loopLen, offset = 0) {
  return ((time % loopLen) / loopLen) * TAU + offset;
}
// Blend f across one period P so tiled noise/scrolls have no seam.
function tileBlend(f, t, period) {
  const m = ((t % period) + period) % period, k = m / period;
  return f(m) * (1 - k) + f(m - period) * k;
}
// Export for workers / node smoke tests; harmless in a plain script tag.
if (typeof self !== 'undefined') self.PIXEL = { TAU, SIN, COS, R2, rgb, clamp, lerp, ease, bayerAt, COOL, WARM, hash, noise, makeView, rampOf, loopAngle, tileBlend };
