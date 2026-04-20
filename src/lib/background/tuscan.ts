// Tuscan Hills — layered rolling hills with cypress trees under a
// golden-hour sky. Static snapshot of a single moment (animation
// stripped by design). Palette derived from DESIGN.md tokens: olive
// darkened toward ink per layer for the greens, parchment/warmCream/
// ochre for the sky gradient, ink for cypress silhouettes.
import { mulberry32, range } from "./rng";
import { createNoise2D } from "./noise";
import { mixColor } from "./mix";
import type { Palette } from "./palette";

export function drawTuscan(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  palette: Palette,
): void {
  const rng = mulberry32(seed);
  const noise = createNoise2D(seed);

  // Sky: soft dusty blue → parchment → ochre at the horizon.
  const skyTop = mixColor(palette.dust, "#6a8499", 0.55); // warm dusty blue
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, skyTop);
  skyGrad.addColorStop(0.55, palette.parchment);
  skyGrad.addColorStop(1, palette.ochre);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Sun glow — soft radial at a seeded position.
  const sunX = range(rng, w * 0.2, w * 0.8);
  const sunY = range(rng, h * 0.18, h * 0.38);
  const sunR = Math.max(w, h) * 0.45;
  const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  sunGrad.addColorStop(0, "rgba(255, 221, 170, 0.55)");
  sunGrad.addColorStop(0.4, "rgba(255, 190, 130, 0.22)");
  sunGrad.addColorStop(1, "rgba(255, 190, 130, 0)");
  ctx.fillStyle = sunGrad;
  ctx.fillRect(0, 0, w, h);

  const layerCount = 5;

  for (let i = 0; i < layerCount; i++) {
    const t = i / (layerCount - 1);
    // Horizon descends from ~45% (back) to ~88% (front).
    const baseY = h * (0.45 + 0.43 * t);
    const amp = 22 + 20 * (1 - t);
    const freq = 1 / (180 + 60 * t);
    const phase = i * 991 + (seed % 997);

    // Greens: olive lightly darkened as layers move forward. Cap the
    // progression so the foreground stays readable rather than near-black.
    const darken = 0.05 + 0.28 * t;
    const layerColour = mixColor(palette.olive, palette.ink, darken);
    const cypressColour = mixColor(layerColour, palette.ink, 0.28);

    const sampleHillY = (x: number) => {
      const n = noise((x + phase) * freq, i * 1.7);
      return baseY + Math.sin(x * freq * 2.5 + i) * amp * 0.3 + n * amp;
    };

    ctx.fillStyle = layerColour;
    ctx.beginPath();
    ctx.moveTo(0, h);
    const samples = Math.ceil(w / 4);
    for (let s = 0; s <= samples; s++) {
      const x = (s / samples) * w;
      ctx.lineTo(x, sampleHillY(x));
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Cypresses — 2-5 per layer, placed on the hill contour.
    const cypressCount = 2 + Math.floor(rng() * 4);
    ctx.fillStyle = cypressColour;
    for (let c = 0; c < cypressCount; c++) {
      const x = rng() * w;
      const y = sampleHillY(x);
      const treeH = 26 + 18 * (1 - t) + rng() * 12;
      const treeW = 5 + 2 * (1 - t);

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(
        x - treeW, y - treeH * 0.3,
        x - treeW * 0.6, y - treeH * 0.8,
        x, y - treeH,
      );
      ctx.bezierCurveTo(
        x + treeW * 0.6, y - treeH * 0.8,
        x + treeW, y - treeH * 0.3,
        x, y,
      );
      ctx.closePath();
      ctx.fill();
    }
  }
}
