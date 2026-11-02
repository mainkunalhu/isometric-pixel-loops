# Scrolling camera: bake wide, shift the window

For endless walkways, rivers, streets — anything the camera travels along. The place bakes once into a wide buffer; each frame copies a shifted slice with depth correction.

## Setup

```js
// Wide target: canvas W + one full period KP, same projection.
// Period P in world units maps to KP = P * S / R2 screen px horizontally.
const KP = 184, P = KP * R2 / S;
const wide = { w: W + KP, h: H + KP / 2, pix: new Uint32Array((W + KP) * (H + KP / 2)), /* zb, ground, groundZ, shadow */ };
// Bake with the walkway pattern repeating every P (use tileBlend from pixel.js).
// Camera k: whole even-pixel steps only. World offset behind shift k: off = k * COS / S.
```

## Per-frame slice

```js
const kk = ((k % KP) + KP) % KP;
for (let iy = 0; iy < H; iy++) {
  const src = (iy + kk / 2) * wide.w + KP - kk;
  pix.set(wide.pix.subarray(src, src + W), iy * W);
  zb.set(wide.zb.subarray(src, src + W), iy * W);
  for (let ix = 0; ix < W; ix++) zb[iy * W + ix] -= (k * COS) / S; // depth correction
}
```

Movers draw in view space (`y - camY()`); the mask/fog stays fixed on screen while the world scrolls through it. Patch trick: re-bake a variant (open gantry, lit windows) and keep only differing pixels pinned to their world spot. Lamps/props repeating with the walkway scroll by the wrapped offset `((k % KP) + KP) % KP * R2 / S`.

Rule: one period KP must exceed the widest screen span or the seam shows. Quantize the camera to even pixels or edges crawl.
