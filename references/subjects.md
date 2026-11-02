# Subjects: any prompt → archetype recipes

Before writing scene code, decompose the user's prompt into archetypes below. Every element on the island must match one recipe. If the prompt names something with no recipe, substitute the closest one and say so — never invent primitives.

## Terrain (groundColor kinds — use LOOP_KINDS)

| kind | code | tones | used for |
| --- | --- | --- | --- |
| WATER | 1 | starter dock tones | pond, river, pool |
| SAND | 2 | PAL.sand | beach, desert, path |
| GRASS | 3 | GRASS | meadow, lawn, forest floor |
| STONE | 4 | PAL.stone | plaza, mountain, ruins |
| SNOW | 5 | PAL.snow | winter (figures keep warm palette) |
| MUD | 6 | PAL.mud | swamp, autumn bank, road verge |
| LAVA | 7 | PAL.lava | volcano (glow dots instead of shadows nearby) |
| ROAD | 8 | PAL.road | streets, crossings (`roadStripes` on top at z 0.02) |

Transitions: sand ring between water and grass (beach), stone ring around lava, road band with curbs (darker edge boxes) through grass/stone. Rings are `edge`-style SDF bands in `groundColor`, 0.8–1.2 units wide.

## Water

- Pond: still ellipse, `drawWater`-style scrolling streaks, `FLOW = SPAN/LOOP_LEN`.
- River: `makeFlow({x0,x1,y0,y1})` + `drawFlow(t, flow, 'x'|'y')` along the long axis.
- Waterfall: rock stack (`box` tiers) + `drawFall(x,y,zTop,zBase,t)` + foam pool + `drawSmoke` mist.
- Shore: `drawShore`-style foam pulse at the waterline; wet sand band baked darker.
- Puddle: small dark ellipse + one expanding ring retriggered per loop.

## Vegetation (call in bake, castShadow each)

- Broadleaf: `growTree(x,y,scale,count,seed)` — the hero tree, one per island max.
- Conifer: `growPine(x,y,scale,seed)` — mountains, snow, forest depth.
- Palm: `growPalm(x,y,scale,seed,lean)` — beach, tropics; lean over water.
- Bamboo: `growBamboo(x,y,n,scale,seed)` — alleys, panda-adjacent gags, wind star.
- Bush: `growBush(x,y,r,color,seed)` — filler between props, never alone mid-ground.
- Flowers: `growFlowers(cx,cy,rx,ry,n,seed)` — meadow confetti on KIND_GRASS only.
- Reeds: `growReeds(x,y,n,seed)` — water edges, always touching water.
- Lily pads: 3–5 flat green `sphere(...,0.06)` on pond + one flower.

## Structures (every prop anchored — see staging-logic.md)

- Stall/shop: counter (hip height) + 2 posts + roof slab + goods on counter.
- House: 4 walls (`box`), gabled roof (2 slabs meeting at ridge), door dark inset, 1 window warm `gloss`.
- Bridge: arc of 5–7 `box` steps + 2 rails (`capsule` lines) over water/road.
- Dock: planks via `box` row + 4 posts into water (see starter-loop).
- Fence: posts every 1.2 + 2 rails, along one island edge.
- Gate/shrine: 2 pillars + double lintel + roof slab; bull skull optional.
- Tower: 3 stacked shrinking boxes + cap roof; ladder rungs optional.
- Steps/stairs: 3–5 rising boxes, each `castShadow`, top lands on a platform — never floating bars.

## Actors

- Human idle/seated/working: `figure()` + arm pose library (figure-rig.md).
- Human walking/running: `walkPose()` 4-key gait, path wrapped with `% SPAN`.
- Dog: `dog(x,y,yaw,{wag,barkBeat,sit},palette,dynamicAdd)` — barkBeat 0..3 fires head-lift + 3 halo rings on that beat; tail wags on `loopAngle`; palette `{coat,snout,ear}`.
- Cat: dog pose with `sit:true`, scale 0.6, no bark (tail slow sway).
- Bird perched: 2 spheres + beak dot, hop every 2 beats. Flying: `drawBirds(t, birds)`.

## Weather & FX

- Rain: `drawRain(t, drops)` 80 drops, diagonal, no accumulation. Snow: `drawSnow` 50 flakes slow drift.
- Petals/leaves: `drawPetals(t, petals)` 12–20, sway on `loopAngle`, wrap vertically.
- Fire: `drawFire(t,x,y,z,size)` + `drawSmoke` above; grill, torch, volcano vent.
- Glow/energy: `glowDots(cx,cy,cz,t,color)` + `haloDots` first. Slash arcs: white `haloDots` streaks gated to air pixels.
- Dust puff: 3 dots `rgb(220,210,200)` on contact beats. Splash: white dots + one ring.

## Movie-scene mapping (examples)

- Anime shrine showdown: gate/shrine + STONE + 1 hero seal-hold + `glowDots` + slash arcs + petals.
- Dog barking at mailman: house + fence + ROAD + dog `barkBeat:1` + walker passing on beats 2–3.
- Waterfall forest: rock stack + `drawFall` + pond + pines + bamboo + dog sitting + petals.
- Beach day: SAND + water + palm + reeds + swimmer bob + shore foam + birds.
- Volcano: LAVA + STONE + smoke + glow + falling ash (`drawSnow` grey).
