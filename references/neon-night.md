# Neon night: dark-void cinematic variant

Same camera, same depth buffer, inverted light. Page background near-black (`#07060b`); the island is the only lit thing.

## Palette swaps

- Ground: deep blue-greys `[22,22,34] → [60,54,76]`, joints darker by 1 step.
- Structure: gunmetal `[64,68,84]`, rails `[58,52,70]`, lit faces keep emissive color on every face (no ramp darkening for `glow:true`).
- Light: cyan `[90,235,255]`, amber `[255,170,70]`, pink `[255,70,186]`, red beacons `[235,50,70]`. Face light: cool rim top edge (`0.45` mix), warm practicals below.
- Sky/city: violet haze gradient by depth + analytic lit windows at 3–5% density; distant = dark shapes in haze.

## Glow (the kit)

1. Halo first: `haloDots()` white 4-neighbour under every lit pixel, wider halo for big sources.
2. Blur boxes: two-pass box blur of the light into a box 48px wider than the subject; add back at 0.12–0.35 alpha.
3. Flicker: `0.72 + 0.13*sin(t*2.3) + 0.08*sin(t*17)`; dropout frames (`hash(floor(t*9)) > 0.985` skip); occasional row tear.
4. Fog mask: fixed screen-space ragged mask (`noise*0.25`), world scrolls through it; unlit pixels fall back to void.

## Wet + signs

- Puddles: standing-water mask baked with the ground; reflections by mirroring depth (`z → 2*z*COS*S` px lower), nearest mirrored point wins, ripple wobble `sin(ty*0.7 + t*5)`.
- Signs: system-font text rasterized to 1-bit mask, stood on iso planes along x/y, drawn as translucent light with scanlines (every 3rd row dimmer), fog falloff, LED variant = every-other-pixel dot grid.
- Rain picks up light: streak alpha from the glow at its pixel; splashes on impact (pool, life 0.14s).

Night rule: exactly one hero light color + one accent. Two neons max or the scene goes muddy.
