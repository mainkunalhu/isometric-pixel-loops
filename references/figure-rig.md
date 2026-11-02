# Figure rig: readable humans at 360x280

`figure(x, y, yaw, pose, palette, addBone)` returns the right hand. Head `r 0.24` is ~5px across — the minimum readable face. Anything smaller is noise.

## Proportions

- Standard: `scale 1`, hip `1.28`, head `0.24`, hair cap `0.205`.
- Anime/hero: `scale 0.95-1`, head `0.28`, hair via `spikyHair(hx,hy,hz,color)` — 5 `rough` spheres, never more. Headband via `headband(hx,hy,hz,t)`.
- Seated: `z seatH, scale 0.88, crouch 0.85, stance 0.05`.
- Child: `scale 0.7`, stance `0.1`.

Cloth/skin must differ from ground hue by 2+ ramp steps or the figure melts into the place. Stripes and patterns need >= 3px bands.

## Walk cycle (quantized, never eased)

Use `walkPose(t, {phase, swing, armSwing})`. 4 discrete keys per loop:

| key | `step` | stance | arms | crouch |
| --- | --- | --- | --- | --- |
| contact | 0 | +swing | R fwd | base |
| pass | 1 | +swing | neutral | base + 0.05 lift |
| down | 2 | -swing | R back | base |
| up | 3 | -swing | neutral | base + 0.05 lift |

`swing 0.13`, `armSwing 3`, `crouchBase 0.06`, `leanBase 0.08`. Feet land identically at frame 0 and `LOOP_LEN` because keys are `floor(k*4)`, not `sin`. Never lerp between keys — eased feet slide.

Head yaw quantized: `yaw = Math.round(yaw / 0.35) * 0.35`.

## Arm pose library (radians: 0 hang, ~1.3 fwd, 2.8-3.6 overhead)

- idle: `armR 0.1, armL 0.08` + breathe `sin(a)*0.03` on lean
- holding rod/tool: `armR 1.25 + breathe, armL 0.3`
- wiping/flipping: `armR` eased `1.35 -> 2.2` over beats 1-2, back over 3-4
- seal set (ram/tiger/clone-cross): discrete pairs `(1.5/1.5)`, `(2.2/0.6)`, `(2.8/2.8)` held one full beat each, never blended
- sparkler-eight: hand tip `sin(a)*0.5 / cos(a*2)*0.3`, rod tip follows

## Secondary motion

Hair tails, headband tails, sleeves, noren lag one 8fps tick: drive with `lagAngle(t)` = `loopAngle(t - 1/WIND_FPS)`. Amplitude `0.1-0.15` world. Primary body uses `loopAngle(t)`, trailing cloth uses `lagAngle(t)` — same period, one tick late, still seamless.
