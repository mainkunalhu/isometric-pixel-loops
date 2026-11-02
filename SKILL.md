---
name: isometric-pixel-loops
description: Build seamless isometric pixel-diorama loops AND walk-to-trigger toys (software rasteriser, one small place — white diorama or dark cinematic, ambient loop or one-input performance). Use when asked for an isometric pixel animation, pixel loop, pixel toy, ambient video, diorama video, looping pixel scene, anime-style pixel loop, pixel waterfall/forest/beach/dog/rain, neon-night scene, walkable vignette, or any subject in the pixel-diorama style. Ships a timeline-only MIT engine with terrain/vegetation/water/weather/creature/FX helpers, worker-safe pixel core, four starters, and recipes for walk cycles, staging, composition, palettes, acts, scrolling cameras, neon night and seamless export.
license: MIT
compatibility: node >= 18, modern browser with canvas, ffmpeg optional for mp4 export
metadata:
  author: isometric-pixel-loops
  version: "3.0"
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
| Walk-to-trigger toy | Starter toy + acts, one input one verb | 1, 10 |
| Still frame | One baked frame, no rAF, PNG export | 8 |
| Loop embedded in a site | Loop canvas paused off-screen, same engine | 9 |

All tracks share the engine and visual rules. Read [references/visual-rules-loops.md](references/visual-rules-loops.md) before scene code.

## Stage presets

`PP_LOOP` takes stage dimensions — resolution is a preset, not a constant:

```js
window.PP_LOOP = { w: 360, h: 280, unit: 10, originY: 10 };   // diorama (default)
window.PP_LOOP = { w: 960, h: 540, unit: 26, originY: 55 };    // cinematic
```

Diorama: white page, ambient loop. Cinematic: near-black void page (`#07060b`), neon-night kit ([references/neon-night.md](references/neon-night.md)), acts or scrolling camera. Same projection math, different scale.

## 1. Decompose the prompt into archetypes (do this first)

Any prompt — waterfall, dog barking, movie duel, ramen alley — maps to [references/subjects.md](references/subjects.md). Fill this worksheet before scene code:

1. **Terrain + water:** pick kinds from LOOP_KINDS (GRASS/SAND/STONE/SNOW/MUD/LAVA/ROAD/WATER) + water body (none/pond/river/falls/shore/puddle). Palette rows from [references/palettes.md](references/palettes.md).
2. **Vegetation (pick 2–3):** tree/pine/palm/bamboo/bush/flowers/reeds/lily. One hero plant max.
3. **Structure (0–1):** stall/house/bridge/dock/fence/gate/tower/steps. Every prop anchored per staging-logic (roof needs posts, crates touch walls, stripes inset via `roadStripes`).
4. **Actors (max 3):** human idle/walk/seated/working, dog/cat (`dog()` with `barkBeat`), perched bird. 1 hero + rest ambient.
5. **Motion budget:** each motion assigned a beat in [references/loop-beats.md](references/loop-beats.md). If the prompt names something with no recipe, substitute the closest archetype and say so — never invent primitives.

Readable-silhouette test: squint at 1:1 — every actor's action reads in 2 seconds. Contrast law: cloth/skin 2+ ramp steps from the ground mean.

## 2. Start from the starter

```bash
cp assets/engine-loop.js ./my-loop/engine-loop.js
cp assets/starter-loop/index.html ./my-loop/index.html
# or: cp assets/starter-runner/index.html ./my-loop/index.html   # street cross
# or: cp assets/starter-nature/index.html ./my-loop/index.html   # waterfall + dog
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

The starters: `starter-loop` is a morning dock (seated breath, shimmer, circling fish). `starter-runner` is a street cross (4-key `walkPose` gait, flip beats, lantern). `starter-nature` is a falls glade (waterfall + pond + pines/bamboo + barking dog + petals). Copy the closest one to the prompt's archetypes, then change the subject.

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
4. **It fills.** Run `measureFill()` after `draw()`: island 12–40%, tallest actor 25–80px. Fix with `HALF_X/Y` and figure scale, never canvas zoom. See [references/composition.md](references/composition.md).
5. **It survives.** Reduced-motion freezes plants. Resize keeps integer scale. Hidden tab resumes without a jump (`dt` clamped `0.04`).

## 8. Still frames

A still is the same scene with no loop. Delete `update`/`frame`, keep `bake()`, call `draw()` once with `G.time = LOOP_LEN * 0.3` (a pose mid-breath reads best). Export at 3x nearest neighbour.

## 9. Loops in sites

One canvas per visible scene, paused with `IntersectionObserver` when off screen. Caption in small monospace at the edges, never a card over the diorama. Honor `prefers-reduced-motion` (starter already freezes via `windTime`).

## 10. Toys: walk to trigger

When the ask is interactive, copy `assets/starter-toy/` instead of a loop starter and declare `window.PP_TOY = true`:

- One input (arrows/click to walk, or tap), one verb (approach). `G.locked = true` during the performance.
- Acts table with `enter(act)`/`actDone()` + subtitle lines on timers via polite live region — see [references/acts-subtitles.md](references/acts-subtitles.md).
- Scrolling worlds: bake wide once, shift the window per [references/scrolling-camera.md](references/scrolling-camera.md).
- Heavy bakes (ray-marched figures, cities): `assets/pixel.js` + workers per [references/worker-bake.md](references/worker-bake.md).
- Checker runs toy rules for `PP_TOY` pages: acts, lock, live region, `window.__toy` hook.

## 11. Originality and licence

`assets/engine-loop.js` and `assets/pixel.js` are MIT. Ship them with new loops and toys. Do not ship music you do not own.

The style is a direction, not assets. Take the camera, dither, ramps and edge. Do not rebuild the starter dock, the Pixel Plays game subjects, or the juggle/fish/stall/court reference scenes as your loop subject.

## Reference

- [references/visual-rules-loops.md](references/visual-rules-loops.md): the ten rules and the screenshot check.
- [references/loop-techniques.md](references/loop-techniques.md): bake/draw order, seamless-time math, water, grass, export, pitfalls.
- [references/subjects.md](references/subjects.md): any-prompt archetype map — terrain, water, vegetation, structures, actors, creatures, weather, FX, movie-scene mappings.
- [references/composition.md](references/composition.md): measured fill % (court 36 / dock 27 / stall 26 / juggler 14), framing presets, diagonal bias, `measureFill`.
- [references/palettes.md](references/palettes.md): sampled packs, contrast law, water vs lava.
- [references/figure-rig.md](references/figure-rig.md): proportions, walkPose gait, arm poses, secondary motion.
- [references/staging-logic.md](references/staging-logic.md): prop anchors, road stripes, paths, ground sizing.
- [references/anime-fx.md](references/anime-fx.md): style cues, halo/glow, rain/steam/heat (never copied characters).
- [references/loop-beats.md](references/loop-beats.md): 4-beat choreography for up to 3 movers.
- [references/scrolling-camera.md](references/scrolling-camera.md): wide-bake + shifted window, depth correction, patch trick.
- [references/acts-subtitles.md](references/acts-subtitles.md): acts table, locks, line timers, live regions, toy test hook.
- [references/worker-bake.md](references/worker-bake.md): pixel.js in workers, job queue, ready gates.
- [references/neon-night.md](references/neon-night.md): dark-void palette, glow kit, fog, wet reflections, lit rain.
- `assets/engine-loop.js`: the renderer + any-subject kit, do not edit per loop.
- `assets/pixel.js`: worker-safe pure core (no DOM), mirrored math for heavy bakes.
- `assets/starter-loop/index.html`: the worked morning-dock loop.
- `assets/starter-runner/index.html`: the worked street-runner loop.
- `assets/starter-nature/index.html`: the worked falls-glade + barking-dog loop.
- `assets/starter-toy/index.html`: the worked lantern-keeper walk-to-trigger toy.
