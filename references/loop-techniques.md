# Loop techniques: bake once, animate the loop clock

All snippets assume `assets/engine-loop.js` globals. No input, no HUD, no score.

## 1. Bake once / draw every frame

```js
function bake() {
  zb.fill(-1e9);
  pix.fill(rgb(255, 255, 255));
  for (let iy = 0; iy < H; iy++) for (let ix = 0; ix < W; ix++) {
    const g = unproject(ix + 0.5, iy + 0.5), i = iy * W + ix;
    const c = groundColor(g.x, g.y, ix, iy, i);
    if (!c) continue;
    pix[i] = c; ground[i] = 1;
    zb[i] = (g.x + g.y) / R2 * COS;
  }
  groundZ.set(zb);
  // props: box, sphere, capsule, growTree + castShadow per prop
  bakeOcclusion();
  staticShadow.set(shadowMask); // before applyShadows clears it
  applyShadows(groundZ);
  bakedPix.set(pix); bakedZ.set(zb);
}

function draw() {
  pix.set(bakedPix); zb.set(bakedZ); pendingShadows.length = 0;
  drawActors(G.time);                       // figure() + moving props via dynamicAdd
  const wt = windTime(G.time);
  drawLeaves(wt); drawTufts(wt); drawWater(wt);
  flushShadows(); applyShadows(bakedZ); shadeEdges();
  drawOverlays();                           // drawDots only, no depth writes
  ctx.putImageData(image, 0, 0);
}
```

Order matters. `staticShadow.set` before `applyShadows`. `shadeEdges` after shadows, overlays last.

## 2. Seamless time

```js
const a = loopAngle(t, phase); // ((t % LOOP_LEN)/LOOP_LEN) * TAU + phase
const breathe = Math.sin(a) * 0.03;
const hop = Math.max(0, Math.sin(a * 2)) * 0.06; // 2 hops per loop, wraps
```

Rules: no velocity integration across the loop boundary. No `x += vx*dt` for looped actors unless wrapped with `% span` where `speed * LOOP_LEN` is an integer multiple of `span`. Prefer closed-form `sin/cos` of `loopAngle`. Quantize plant time with `windTime()` (8fps) so sway feels hand-animated.

Streak wrap (seamless scroll):
```js
const SPAN = 16, FLOW = SPAN / LOOP_LEN;
const y = ((y0 + t * FLOW) % SPAN + SPAN) % SPAN - SPAN / 2;
```

## 3. Ground

```js
function groundColor(x, y, ix, iy, i) {
  const edge = Math.pow(Math.pow(Math.abs(x) / HALF_X, 4) + Math.pow(Math.abs(y) / HALF_Y, 4), 0.25)
    + (noise(x * 1.3, y * 1.3) - 0.5) * 0.12;
  if (edge > 1.04) return 0;
  if (edge > 0.94 && hash(ix, iy) < (edge - 0.94) / 0.1) return 0;
  kinds[i] = KIND_WATER; // or KIND_GRASS
  // ... tone select with bayer
}
```

Sample hand-built surfaces at `0.03-0.07` world units (< 1px) or holes strobe each loop.

## 4. Water, rings, fish

Streaks: fixed `hash` seeds, gate `kinds[i] === KIND_WATER && zb[i] === groundZ[i]` so they never paint props. Lit `rgb(150,208,180)`, soft `rgb(104,180,158)`, dim-in-shadow `rgb(58,112,120)`.

Rings: retrigger on loop phase, not on events. Radius `3 + (t % LOOP_LEN)/LOOP_LEN * 7`, alpha via hash skip. Fish shadows: 1px-dark `rgb(40,84,92)` dots circling with `loopAngle`.

## 5. Grass, leaves, cloth

`growGrass()` after ground, keyed on `KIND_GRASS`. `drawTufts(wt)` offsets columns by `round(gust * 0.95 * k/3)`. `growTree(x, y, scale, count, seed)` captures leaf pixels once; `drawLeaves(wt)` sways whole pixels. Cloth ripple: `wave = u*3.2 + wt*speed + phase`, sideways `sin(wave)*amp*reach`, amplitude `0.12-0.4`, speed `3-5`.

## 6. Figure loop poses

`figure(x, y, yaw, pose, palette, dynamicAdd)` returns the right hand. Loop-safe poses:
- idle breathe: `lean: Math.sin(a)*0.03`, stance `0.08`
- seated: `z: seatH, scale: 0.88, crouch: 0.85, stance: 0.05`
- holding a rod: `armR: 1.25 + breathe`, `armL: 0.3`
- drinking/lifting: `armR: 1.35 -> 2.2` eased over first half-loop, back over second half
-head yaw quantized: `yaw = Math.round(yaw / 0.35) * 0.35`

Rods/lines: `capsule(hand, tip, 0.05, 0.03, () => [80,64,48], 'solid')`, line via `plot` steps of `0.12`, bobber via `drawDots`.

## 7. Props and shadows

`box(x0,y0,z0,x1,y1,z1,color,seed)` for decks, crates, stalls. `sphere(..., 'rough')` for stones/fruit, `'gloss'` for wet/bobber highlights, `'solid'` for figures. `castShadow` per static prop in `bake`; moving actors via `dynamicAdd` + `flushShadows()` in `draw`. Shadows over uneven surfaces need a height lookup, not `z = 0`.

## 8. Export

Live loop is the artifact. For video files: `canvas.captureStream(30)` + `MediaRecorder` for exactly `LOOP_LEN * 1000` ms, then `ffmpeg -i loop.webm -pix_fmt yuv420p loop.mp4`. PNG: 3x canvas, `imageSmoothingEnabled = false`.

## 9. Loop pitfalls

1. Sweep curves by angle, not x, or steep parts gap and flicker.
2. Gate water/rings/streaks on `zb === groundZ` + `kinds` or they paint figures for one frame.
3. `applyShadows(bakedZ)` lets moving shadows fall on props; `groundZ` keeps them on bare ground only. Never on figures.
4. Step everything ambient through `windTime`; smooth `time` reads as the wrong style.
5. Keep stripes >= 3px, close tones on big surfaces, no gradients.
6. Frame 0 must equal frame LOOP_LEN: test `step()` headlessly and diff pixels.
