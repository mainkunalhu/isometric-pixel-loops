---
name: isometric-pixel-loops
description: Build seamless isometric pixel-diorama loop animations (360x280 software rasteriser, one small place on white, 4-10s ambient loop, no input). Use when asked for an isometric pixel animation, pixel loop, ambient video, diorama video, looping pixel scene, anime-style pixel loop, or a video version of the pixel-diorama style. Ships a timeline-only MIT engine, two starter loops (fishing dock, street runner), the visual rules, and loop recipes for walk cycles, figure rigs, staging, anime FX and seamless export.
license: MIT
compatibility: node >= 18, modern browser with canvas, ffmpeg optional for mp4 export
metadata:
  author: isometric-pixel-loops
  version: "1.1"
  scope: animation-loop
  platforms: [claude-code, cursor, antigravity, zed, opencode, windsurf, copilot, skills.sh]
---

# Isometric pixel loops

One small place on white, one readable motion, looped so frame 0 equals frame N. The look comes from the renderer, not a filter. Change the subject, keep the rules.

Five ways it fails:

- **A scene, not a place.** No edge, no ground plane, nowhere to stand. The diorama must feel like a tabletop model.
- **No motion.** Pretty pixels with nothing alive. Every loop is actor motion plus wind/water.
- **A cut, not a loop.** Motion that jumps at the wrap. Everything must be a closed function of loop time.
- **Detail at the wrong scale.** 360 by 280 holds ~100,000 pixels. A window is 8px. A face is 4. Finer detail reads as noise.
- **A floating prop.** Stripes that read as stairs, roofs with no posts, orphan crates. Every prop needs an anchor; see [references/staging-logic.md](references/staging-logic.md).
- **A copied subject.** Do not rebuild the starters, the five Pixel Plays games, named anime characters, villages, or jutsu. Style cues only, never assets.

## 0. Choose the output

| Ask | Build | Section |
| --- | --- | --- |
| Seamless loop page | Starter loop + timeline, runs forever | 1 to 7 |
| Still frame | One baked frame, no rAF, PNG export | 8 |
| Loop embedded in a site | Loop canvas paused off-screen, same engine | 9 |

All three use the same engine and visual rules. Read [references/visual-rules-loops.md](references/visual-rules-loops.md) before scene code.

## 1. Pick one readable motion

Silhouette-readable from a fixed camera: walk, run, wipe, flip, fan, seal set, paddle, sweep, pour, swing, drip, shimmer pass.

A good loop motion has all three:

1. ** readable silhouette.** Limbs separate from torso at 1:1. Test: squint — the action still reads.
2. **A visible cycle.** Leaves the hand, crosses the place, returns. The viewer can time it within 2 seconds.
3. **No accumulation.** Nothing spawns, scores, or moves permanently. Rings/fish/streaks wrap.

Up to 3 movers: 1 hero + 2 ambient, choreographed on 4 beats (see [references/loop-beats.md](references/loop-beats.md)). Each beat peaks one action; test each actor solo.

Test: say the loop in one sentence with its period. "A headband runner crosses while a vendor flips and a lantern sways, 8 seconds." If it needs "and then", it is two loops.

Figures use [references/figure-rig.md](references/figure-rig.md): `walkPose()` 4-key gait, quantized heads, arm pose library, `lagAngle` secondary motion. Anime style cues (never copied characters) via [references/anime-fx.md](references/anime-fx.md). Every prop anchored per [references/staging-logic.md](references/staging-logic.md).

Fits: walk/run cross, wipe/flip cycle, seal-hold-release, ripple rings, lantern sway, grill shimmer.
Does not fit: camera moves, cuts, dialogue, menus, close-ups, per-pixel precision.

## 2. Start from the starter

```bash
cp assets/engine-loop.js ./my-loop/engine-loop.js
cp assets/starter-loop/index.html ./my-loop/index.html
# or: cp assets/starter-runner/index.html ./my-loop/index.html
```

```text
my-loop/
  index.html      page, PP_LOOP config, scene + timeline
  engine-loop.js  shared renderer, do not edit per loop
```

`index.html` loads in this order: markup, then `window.PP_LOOP`, then `engine-loop.js`, then the scene script. The engine needs `<canvas id="c">` and reads `PP_LOOP` once at load.

```js
window.PP_LOOP = { originY: 10, shadowX: 1.3, shadowY: -0.12, loopLen: 8 };
```

Open the file directly or through any static server. No build step, no dependency. Keep it that way.

The starters: `starter-loop` is a morning dock (two seated figures breathing, rods bobbing, water streaks, circling fish, one ripple ring). `starter-runner` is a street cross (headband runner on a 4-key `walkPose` gait, vendor flip, swaying lantern, dust + glow). Read the closest one end to end before changing it.

## 3. Set the scene

`PP_LOOP` has four numbers:

```js
window.PP_LOOP = { originY: 10, shadowX: 1.3, shadowY: -0.12, loopLen: 8 };
```

- `originY` moves the world origin down the canvas. Tall places need + headroom.
- `shadowX/shadowY` set shadow travel per unit height. Defaults give ~10px right, ~4px down.
- `loopLen` is the seamless period in seconds. 6-10 is the range; 8 is the default.

Then `groundColor(x, y, ix, iy, i)`. Return packed color or `0` for white page, set `kinds[i]`:

```js
const KIND_WATER = 1;
function groundColor(x, y, ix, iy, i) {
  const edge = Math.pow(Math.pow(Math.abs(x) / HALF_X, 4) + Math.pow(Math.abs(y) / HALF_Y, 4), 0.25)
    + (noise(x * 1.3, y * 1.3) - 0.5) * 0.12;
  if (edge > 1.04) return 0;
  if (edge > 0.94 && hash(ix, iy) < (edge - 0.94) / 0.1) return 0;
  kinds[i] = KIND_WATER;
  const v = 0.5 + (noise(x * 0.6, y * 0.35) - 0.5) * 0.5;
  return rgb(...WATER_TONES[clamp(Math.floor(v * 4 + (bayerAt(ix, iy) - 0.5) * 0.6), 0, 3)]);
}
```

Pick `HALF_X/HALF_Y` from the motion. Water loops want width for streak travel; courtyard loops want depth for circling.

## 4. Bake the place once

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
  buildProps(); // box, sphere, capsule, growTree
  bakeOcclusion();
  staticShadow.set(shadowMask);
  applyShadows(groundZ);
  bakedPix.set(pix); bakedZ.set(zb);
}
```

Props from five primitives: `box`, `plot`, `sphere(x,y,z,r,color,mode)`, `capsule(a,b,r0,r1,colorOf,mode)`, `growTree`. `mode` is `'rough'` (ground clutter), `'solid'` (figures, no dither), `'gloss'` (wet highlights). `castShadow` per static prop before `applyShadows`.

Hand surfaces sample `0.03-0.07` world units. Wider gaps read as damage that strobes each loop.

## 5. Wire the timeline

The loop is fixed. Copy it, only change what is inside:

```js
const G = { time: 0 };
function update(dt) { G.time += dt; }
function draw() {
  pix.set(bakedPix); zb.set(bakedZ); pendingShadows.length = 0;
  drawActors(G.time);                 // figure() via dynamicAdd, rods, props
  const wt = windTime(G.time);        // stepped 8fps, 0 when STILL
  drawLeaves(wt); drawTufts(wt); drawWater(wt);
  flushShadows(); applyShadows(bakedZ); shadeEdges();
  drawOverlays();                     // drawDots only
  ctx.putImageData(image, 0, 0);
}
let last = performance.now();
function frame(now) {
  update(Math.min(0.04, (now - last) / 1000));
  last = now;
  draw();
  requestAnimationFrame(frame);
}
```

Every motion is a closed function of loop time:

```js
const a = loopAngle(t, phase); // ((t % LOOP_LEN) / LOOP_LEN) * TAU + phase
const breathe = Math.sin(a) * 0.03;
```

No velocity integration across the boundary. Scrolling wraps: `((y0 + t * FLOW) % SPAN)` with `FLOW = SPAN / LOOP_LEN`. Quantize heads `Math.round(yaw / 0.35) * 0.35`. Step all ambient through `windTime`.

Expose the test hook:

```js
window.__loop = { G, LOOP_LEN, step(dt, skipDraw) { update(dt); if (!skipDraw) draw(); } };
```

## 6. Export loop or still

Live loop is the artifact. The starter ships two buttons:

- `record webm`: `canvas.captureStream(30)` + `MediaRecorder`, records exactly `LOOP_LEN * 1000` ms, downloads `*-loop.webm`. Convert: `ffmpeg -i loop.webm -pix_fmt yuv420p loop.mp4`.
- `png`: 3x canvas with `imageSmoothingEnabled = false`, `toDataURL` download.

For socials prefer `LOOP_LEN` 6-8s, 30fps webm then ffmpeg to mp4/gif. Verify the exported file loops in a player before shipping.

## 7. Verify it loops

Drive the real page headlessly:

```js
window.__loop.step(1/60, true); // repeat 480x for one 8s loop
```

Check, in order:

1. **It boots.** No console errors, canvas 360x280, white outside edge.
2. **It wraps.** Pixel-diff frame 0 vs frame `LOOP_LEN`: identical. Report the diff count, not "it loops".
3. **It reads.** Screenshot 1:1 and full page, then run the seven checks at the end of [visual-rules-loops.md](references/visual-rules-loops.md).
4. **It survives.** Reduced-motion freezes plants. Resize keeps integer scale. Hidden tab resumes without a jump (`dt` clamped `0.04`).

## 8. Still frames

A still is the same scene with no loop. Delete `update`/`frame`, keep `bake()`, call `draw()` once with `G.time = LOOP_LEN * 0.3` (a pose mid-breath reads best). Export at 3x nearest neighbour.

## 9. Loops in sites

One canvas per visible scene, paused with `IntersectionObserver` when off screen. Caption in small monospace at the edges, never a card over the diorama. Honor `prefers-reduced-motion` (starter already freezes via `windTime`).

## 10. Originality and licence

`assets/engine-loop.js` is MIT. Ship it with new loops. Do not ship music you do not own.

The style is a direction, not assets. Take the camera, dither, ramps and edge. Do not rebuild the starter dock, the Pixel Plays game subjects, or the juggle/fish/stall/court reference scenes as your loop subject.

## Reference

- [references/visual-rules-loops.md](references/visual-rules-loops.md): the ten rules and the screenshot check.
- [references/loop-techniques.md](references/loop-techniques.md): bake/draw order, seamless-time math, water, grass, export, pitfalls.
- [references/figure-rig.md](references/figure-rig.md): proportions, walkPose gait, arm poses, secondary motion.
- [references/staging-logic.md](references/staging-logic.md): prop anchors, road stripes, paths, ground sizing.
- [references/anime-fx.md](references/anime-fx.md): style cues, halo/glow, rain/steam/heat (never copied characters).
- [references/loop-beats.md](references/loop-beats.md): 4-beat choreography for up to 3 movers.
- `assets/engine-loop.js`: the renderer, do not edit per loop.
- `assets/starter-loop/index.html`: the worked morning-dock loop.
- `assets/starter-runner/index.html`: the worked street-runner loop.
