# Composition: frame the subject like the refs

Measured from the four reference videos (non-white pixels via raw frames):

| ref | island px | bbox fill | mean tone | lesson |
| --- | --- | --- | --- | --- |
| court | 36% | 75% | (114,110,97) concrete | wide: subject sprawls, bbox nearly full frame |
| dock | 27% | 39% | (98,136,143) water | medium: diagonal subject, generous white |
| stall | 26% | 50% | (125,133,82) grass | medium: dense props, small island |
| juggler | 14% | 28% | (171,173,132) stone | close: one big figure, tiny island |

## Rules

1. **Island pixels 12–40%.** Below 12% the subject is a speck (your festival failure). Above 40% it touches the frame edge — shrink `HALF_X/Y`.
2. **Tallest actor 25–80px on screen** (`project` the head, measure). Below 25px the face is noise; above 80px limbs clip the island.
3. **Framing presets** (set `HALF_X/Y`, `originY` from these, not by feel):
   - Wide (court-like, 5+ actors/props): `HALF 15x9`, `originY 14`, figure scale ≤ 0.9.
   - Medium (dock/stall, 1–3 actors): `HALF 12x8`, `originY 10–12`.
   - Close (solo hero/creature): `HALF 8x6`, `originY 6–8`, figure scale 1–1.1, island is a plinth.
4. **Diagonal bias.** Lay water/roads/bridges on the x or y diagonal (`y = ±0.5x`), never axis-flat — flat reads as stairs (your crossing failure).
5. **White margin everywhere.** Nothing within 12px of the canvas edge except scattered fringe. Ground never bleeds off-canvas.
6. **One hero zone.** The brightest/saturated prop and the hero actor share one third of the island; the rest is quieter by 1+ ramp steps.

## Measure, don't eyeball

After `draw()`, in console: `measureFill()` → `{islandPct, bboxFillPct}`. Report both numbers in the verification. Fix by scaling `HALF_X/Y` (island size) and figure `scale`, never by zooming the canvas.
