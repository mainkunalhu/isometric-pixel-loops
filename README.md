# isometric-pixel-loops

Seamless isometric pixel-diorama loop animations. One small place on white, one readable motion, 4–10s ambient loop, no input. Timeline-only MIT engine, no build step.

Inspired by the renderer rules of Pixel Plays (camera, dither, ramps, shadows) but rebuilt as a loop-only engine. No game code, no HUD, no score.

## Contents

```text
isometric-pixel-loops/                      # v2.0: any prompt → archetypes → recipes
  SKILL.md
  assets/engine-loop.js                    # renderer + any-subject kit (terrain, plants, water, weather, dog, FX, measureFill)
  assets/starter-loop/index.html           # morning dock (seated breath, shimmer, circling fish)
  assets/starter-runner/index.html         # street cross (walkPose gait, flip beats, lantern)
  assets/starter-nature/index.html         # falls glade (waterfall + pond + pines + barking dog + petals)
  references/subjects.md                   # archetype map + movie-scene mappings
  references/composition.md                # measured fills, framing presets, measureFill
  references/palettes.md                   # sampled packs + contrast law
  references/figure-rig.md                 # walkPose gait, arm poses, secondary motion
  references/staging-logic.md              # prop anchors, roadStripes, paths
  references/anime-fx.md                   # style cues only, halo/glow, rain/steam/heat
  references/loop-beats.md                 # 4-beat choreography, max 3 movers
  scripts/check-loop.mjs                   # wrap + staging + subject-coverage checks
```

## Use

```bash
cp assets/engine-loop.js ./my-loop/engine-loop.js
cp assets/starter-nature/index.html ./my-loop/index.html
# or the dock: cp assets/starter-loop/index.html ./my-loop/index.html
# or the runner: cp assets/starter-runner/index.html ./my-loop/index.html
# decompose ANY prompt first: terrain → water → plants → structure → actors → beats (see SKILL.md §1)
# open ./my-loop/index.html directly, or: npx serve .
# record webm button -> ffmpeg -i loop.webm -pix_fmt yuv420p loop.mp4
```

## Install globally (any harness)

Copy the whole `isometric-pixel-loops/` folder to your agent's skills dir:

- opencode / generic: `.opencode/skills/isometric-pixel-loops` or `~/.config/opencode/skills/`
- claude: `~/.claude/skills/isometric-pixel-loops`
- cursor: `.cursor/skills/isometric-pixel-loops`
- antigravity: `.agents/skills/isometric-pixel-loops`
- windsurf / copilot / skills.sh: same `skills/` layout

Only `SKILL.md` frontmatter matters for discovery (`name`, `description`).

## Rules in short

360×280, 30° ortho, ragged edge on white, 5-tone violet→warm ramps, ordered dither, long rightward shadows, depth-buffer edges, sharp `solid` figures, all motion a closed function of `loopAngle(t)` + stepped `windTime` at 8fps.
