# isometric-pixel-loops

Seamless isometric pixel-diorama loop animations. One small place on white, one readable motion, 4–10s ambient loop, no input. Timeline-only MIT engine, no build step.

Inspired by the renderer rules of Pixel Plays (camera, dither, ramps, shadows) but rebuilt as a loop-only engine. No game code, no HUD, no score.

## Contents

```text
isometric-pixel-loops/
  SKILL.md                           # v1.1: walk cycles, staging, anime FX, beats
  assets/engine-loop.js              # shared renderer + walkPose/lagAngle/spikyHair/headband/haloDots/glowDots/roadStripes
  assets/starter-loop/index.html     # morning dock (seated breath, shimmer, circling fish)
  assets/starter-runner/index.html   # street runner (4-key gait, flip beats, lantern sway)
  references/visual-rules-loops.md
  references/loop-techniques.md
  references/figure-rig.md           # proportions, walkPose gait, arm poses, secondary motion
  references/staging-logic.md        # prop anchors, roadStripes, paths, ground sizing
  references/anime-fx.md             # style cues only, halo/glow, rain/steam/heat
  references/loop-beats.md           # 4-beat choreography, max 3 movers
  scripts/check-loop.mjs
```

## Use

```bash
cp assets/engine-loop.js ./my-loop/engine-loop.js
cp assets/starter-loop/index.html ./my-loop/index.html
# or the runner: cp assets/starter-runner/index.html ./my-loop/index.html
# edit PP_LOOP { originY, shadowX, shadowY, loopLen }, groundColor, bake, drawActors
node scripts/check-loop.mjs ./my-loop/index.html assets/engine-loop.js
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
