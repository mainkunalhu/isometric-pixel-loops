# Anime FX pack: style cues, never copied characters

Do not rebuild Naruto or any named character, outfit, village, or jutsu name. Take motion language only: spiky silhouette, headband tails, hand-seal beats, speed and glow rendered as dots.

## Cues (all original)

- Hair: `spikyHair()` 5 spikes, dark or blond tones. Tails/scarves use `lagAngle`.
- Headband: `headband()` — grey plate (3 gloss dots) + 2 tails rippling. Plate never has a symbol.
- Seals: hold 3 discrete arm pairs one beat each (see figure-rig.md). No text, no names.
- Palette: hero orange/navy `[200,110,50]/[50,60,90]`, rival teal/red. Keep off ground hue.

## Glow and speed (dots only, no sprites)

- `haloDots(points)` then `drawDots(points, color)`: white 4-neighbour halo first.
- `glowDots(cx,cy,cz,t,color,baseR,pulse)`: period-locked ring + white core. Blue-white `[120,200,255]` or warm `[255,200,120]`.
- Speed lines: 3px `drawDots` streaks along motion dir, gated to air pixels (`!ground[i] || zb[i]===groundZ[i]`), life one beat.
- Dust puff on land: 3 dots `rgb(220,210,200)`, rise `0.3`, retrigger on loop phase `floor(t/LOOP_LEN*4)`.

## Rain/steam/heat

- Rain: diagonal 1px dots, fall `FLOW = SPAN/LOOP_LEN` wrapped, drift `+t*1.2`, splash skip.
- Steam: 2-3px columns rising, sway `sin(a+k)*0.2`, alpha via hash skip, respawn at loop wrap not randomly.
- Heat shimmer: skip pixels (`hash > life`) over grill on beats 2-3 only.
