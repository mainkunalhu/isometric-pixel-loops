# Worker bake: heavy frames off the main thread

Use when one bake costs >100ms: ray-marched figures, analytic cities, font-mask signs. The walkway bakes 15 hologram frames in workers while the scene runs.

## Shape

1. Pure core in `assets/pixel.js` (no DOM) — importable in both page and worker.
2. Baker module exposes `bakeFrame(pose) -> {c, z, a, kind, glow boxes}` as transferable buffers.
3. Worker skeleton:

```js
// baker.worker.js
import { bakeFrame } from './baker.js';
self.onmessage = e => {
  const frame = bakeFrame(e.data.job);
  self.postMessage({ name: e.data.name, frame }, { transfer: [frame.c.buffer, frame.z.buffer] });
};
```

4. Page: job queue, `navigator.hardwareConcurrency - 1` workers (max 4), `frames.set(name, frame)` on message, `ready(act)` gate = every strip frame present; fall back to nearest earlier baked frame while waiting.
5. `destroy()` terminates workers. Never bake in the rAF loop.

Keep workers to whole frames/scenes. Per-pixel main-thread march of a 960x540 box is the failure mode this exists to prevent.
