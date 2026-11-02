# Staging logic: every prop earns its place

Failures in the wild: floating stripes that read as stairs, roofs disconnected from walls, orphan crates, grounds so large the actor is lost.

## Anchoring

- Counter/stall front at hip height `1.0-1.2`. Cook stands behind it, grill sits ON it (box top `z` = counter top), bowls on grill.
- Roof needs 2+ posts reaching it. Post `capsule` from ground/counter to roof edge. A pole touching nothing is a bug.
- Crates/barrels touch a wall, counter, or another crate. Never alone mid-ground.
- Lanterns hang from two points (awning edge + cord) or one pole + arm. Cord is a `capsule r 0.03`.
- Crossing stripes are inset in a road band: paint a dark road rect first (or darker ground tone), then `roadStripes(cx,cy,w)` on top at `z 0.02-0.06`. Never white bars on bare dirt.

## Ground sizing

`HALF_X/HALF_Y` from motion width, not canvas. Walker crossing needs depth along the walk axis (`HALF 12x8`). Seated vendor needs `10x7`. If the actor is under 8% of ground pixels, shrink the island.

## Paths

Walkers follow waypoint loops wrapped with `% SPAN`: `x = ((x0 + t*FLOW) % SPAN) - SPAN/2` with `FLOW = SPAN/LOOP_LEN`. Turn only at waypoints, quantized to 45 degrees. Max 1 moving hero + 2 static ambient. Soft-shove: keep figures `>= 0.72` units apart or limbs interpenetrate at this scale.

## Depth order sanity

Ground -> road band -> stripes -> props (with `castShadow` each) -> `bakeOcclusion` -> shadows -> baked. Movers via `dynamicAdd` + `flushShadows()` in draw. Stripes at `z 0.02` so feet at `z 0.12` correctly overlap them.
