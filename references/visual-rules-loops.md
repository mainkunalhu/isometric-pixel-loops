# Visual rules for isometric pixel loops

One small place on white, one readable motion, looped seamlessly. The look comes from the renderer, not a filter.

## 1. One place on white
`bake()` fills `rgb(255,255,255)`, never paints sky. Empty pixels keep `zb = -1e9`. Shadows test `ground[i]`. Background stays white; horizon is geometry.

## 2. 360x280, nearest, integer scale
`W = 360, H = 280, S = 10`. `fit()` uses `Math.floor(fitScale * dpr) / dpr`, `image-rendering: pixelated`. Draw into `pix` only. Export PNG at 3x with `imageSmoothingEnabled = false`.

## 3. Fixed 30-degree camera, ragged edge
`project`: `sx = OX + (x-y)/R2*S`, `sy = OY + ((x+y)/R2*SIN - z*COS)*S`. Edge in `groundColor`: superellipse exponent 4 + `noise * 0.12`, `> 1.04 -> 0` (white), `> 0.94 + hash scatter -> 0` (8-12px fringe). `originY` moves `OY` for headroom.

## 4. Depth buffer + 5-tone ramps + Bayer
Nearer depth wins. `rampOf(c)` builds `[mix(.4,COOL,.34), mix(.62,COOL,.18), mix(.84,COOL,.05), mix(1,WARM,0), mix(1.1,WARM,.22)]` with `COOL = [46,38,84]`, `WARM = [255,232,180]`. Box faces: top `3.4`, lower-left `2.3`, lower-right `1.2`. Sphere light `l = -.55dx -.6dy +.58nz`, index `floor(l*4.4+.2+(bayer-.5)*.7)`.

## 5. Long violet shadows rightward
`castShadow(x,y,z,r)` stamps at `(x + SHADOW_X*z, y + SHADOW_Y*z)`. Default `1.3, -0.12` = ~10px right, ~4px down per z. Tint `(0.54,0.52,0.72)`, contact strength 2 `(0.36,0.34,0.56)`. Never leave the ground.

## 6. Hue-shifted ramps
Shadows drift to violet, highlights to warm yellow. `shadeEdges` warm rim mixes toward `WARM` at `0.3`.

## 7. Depth-buffer edges, no halo
`shadeEdges()` after shadows, before overlays. Object pixel against ground darkens `(0.68,0.66,0.76)`. Never outlines against white page. `drawDots` overlays go last with no depth test.

## 8. Close tones on large surfaces
Water/sand/grass use 4-5 tones ~5-10 per channel. Water may go wider. Grass adds hash speckle, no Bayer on figures.

## 9. Characters stay sharp
Figures use `mode = 'solid'`: `floor(l*4.4+.2)`, levels 1-4, no dither. Head `r = 0.24` (~5px). Stripes >= 3px or they read as noise.

## 10. All motion rides the loop clock
`LOOP_LEN` seconds (default 8). `windT = floor(time*8)/8` for plants/water. Actor motion is `sin((time % LOOP_LEN)/LOOP_LEN * TAU + phase)`. `STILL` (prefers-reduced-motion) freezes to a still frame.

## Screenshot check
1. White outside edge, fringe 8-12px. 2. Faces hold 3-4 tones. 3. Shadows violet, rightward, inside ground. 4. Figures flat-banded. 5. Only plants/water/actors move. 6. Integer scale, no blur. 7. Frame 0 and frame LOOP_LEN identical.
