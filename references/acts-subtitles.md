# Acts + subtitles: toys, not loops

A toy has one input, one verb, and a performance. Use the acts table — never ad-hoc flags.

```js
const ACTS = {
  hidden: { strip: ['idle0'], fps: 1, loop: true },
  appear: { strip: ['idle0', 'rise1', 'rise2', 'idle1'], fps: 5, loop: false },
  greet:  { strip: ['idle1', 'wave1'], fps: 2, loop: true },
  point:  { strip: ['wave1', 'point0'], fps: 5, loop: false },
  farewell: { strip: ['point0', 'sink1', 'sink2'], fps: 5, loop: false },
};
const enter = act => { G.act = act; G.actT = 0; };
const actDone = (act, t) => !ACTS[act].loop && t >= ACTS[act].strip.length / ACTS[act].fps;
```

## Rules

- One input only (arrows/click to walk, or tap). `G.locked = true` during the performance; input resumes after the last line.
- Lines: `[{at: seconds, text}]` with `LINE_SECONDS` display each; announce through `role="status" aria-live="polite"`; `null` when silent. Skipping identical text (same as loops).
- Trigger pattern: reach spot → walk final step → `locked` → act chain with `ready()` gates (every strip frame baked/available) → unlock on last act done + walk-away.
- Test hook: `window.__toy = {G, act, enter, step}` — drive `enter('appear')`, step through, assert `locked` toggles and lines fire in order.
- Reduced motion: acts still play (they are the content) but sway/glow freeze via `windTime`.
