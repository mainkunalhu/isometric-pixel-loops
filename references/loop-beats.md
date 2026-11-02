# Loop beats: choreograph up to 3 actors in 8 seconds

8s loop = 4 beats of 2s. Name them. One action peaks per beat; nothing peaks together.

```js
const beat = Math.floor(((t % LOOP_LEN) / LOOP_LEN) * 4); // 0..3
```

## Template

| beat | hero | ambient 1 | ambient 2 | FX |
| --- | --- | --- | --- | --- |
| 0 | step contact | wipe start | sway | lantern L |
| 1 | step pass | wipe end | breathe | steam up |
| 2 | step down | rest | sway | glow pulse |
| 3 | step up | lift | breathe | ring out |

Implement as discrete `beat` switches calling `walkPose` phases and arm targets — never cross-fade. Seal sequences take 3 beats (one sign per beat) + 1 beat release flash.

## Rules

- Max 3 movers: 1 hero + 2 ambient. A 4th mover halves readability at 360x280.
- Each beat has one readable change visible within 2 seconds of watching.
- Symmetry: beats 0-1 mirror 2-3 where possible so the wrap is invisible.
- Test: mute two actors (skip their draw). Each remaining actor must read alone.
