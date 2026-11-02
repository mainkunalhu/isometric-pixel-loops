# Palettes: sampled packs, close tones, contrast law

Sampled island means from the four refs: concrete (114,110,97), pond (98,136,143), meadow (125,133,82), plaza stone (171,173,132). Every pack below holds 4–5 tones ~5–10 per channel so dither reads as texture, not checkerboard.

## Packs (copy the rows, never eyeball hex)

- concrete: [176,172,164] [184,180,171] [192,188,178] [200,196,186]
- pond: [44,104,112] [52,116,122] [62,130,132] [78,146,142]
- meadow GRASS: [34,62,50] [52,88,52] [82,118,54] [124,146,62] [168,172,76]
- plaza: [168,172,150] [178,182,158] [188,192,166] [198,202,174]
- sand PAL.sand, stone PAL.stone, snow PAL.snow, mud PAL.mud, lava PAL.lava, road PAL.road (see engine `PAL`)
- wood: [138,106,70] / dark [104,80,54]; roof red [168,84,62]; noren/lantern warm [255,190,120] + `gloss`
- skin: [214,162,124] / [198,148,112]; hair dark [46,34,28], grey [120,120,118]

## Contrast law (why your festival figure vanished)

Figure cloth/skin must differ from the ground mean by 2+ ramp steps in at least two channels. Dark purple figure on dark purple mud = invisible. Check: sample ground mean (see table), pick palette rows at distance. Night/dusk: keep the white page, darken only the island 1–2 steps, add warm lantern `gloss` + `glowDots` — never a dark sky.

## Water vs lava

Water: dark middle, light shallows + scrolling streaks (lit 150,208,180 / soft 104,180,158 / dim-in-shadow 58,112,120). Lava: inverse — bright middle (250,200,120 core), dark crust edges — + `drawSmoke` + ember `glowDots`, shadows suppressed near the flow (glow replaces shade).
