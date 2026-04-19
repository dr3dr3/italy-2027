// Slow Morph Tiles — dark tile grid with pools of coloured light. The
// original was animated; this is the static snapshot (seeded light
// positions, noise-driven per-tile base). Palette direction per sub-
// variant is tuned against DESIGN.md tones:
//   embers   → warm (terracotta/ochre/wine heat on dark stone)
//   adriatic → cool (navy base, teal/blue lights) — coolest variant
//   quartz   → near-monochrome grey, barely-visible warm highlights
//   osteria  → warm sandstone + two gold candle lights
// All variants clamp final tile lightness ≤ 20% so content stays legible.
import { mulberry32, range } from "./rng";
import { createNoise2D } from "./noise";
import type { Palette } from "./palette";

export type MorphVariantKey = "embers" | "adriatic" | "quartz" | "osteria";

type LightConfig = {
  hueCenter: number;
  hueJitter: number;
  satBoost: number;
  lightBoost: number;
  radius: number;
  falloff: number;
};

type MorphConfig = {
  tileSize: number;
  gap: number;
  baseHue: [number, number];
  baseSat: [number, number];
  baseLight: [number, number];
  lights: LightConfig[];
  vignetteStrength: number;
  maxLightness: number;
  hueShiftStrength: number;
};

const CONFIGS: Record<MorphVariantKey, MorphConfig> = {
  embers: {
    tileSize: 18,
    gap: 2,
    baseHue: [16, 28], baseSat: [10, 22], baseLight: [7, 11],
    lights: [
      { hueCenter: 28, hueJitter: 10, satBoost: 55, lightBoost: 11, radius: 300, falloff: 2.4 },
      { hueCenter: 15, hueJitter: 8,  satBoost: 50, lightBoost: 9,  radius: 260, falloff: 2.6 },
      { hueCenter: 38, hueJitter: 6,  satBoost: 42, lightBoost: 8,  radius: 280, falloff: 2.5 },
    ],
    vignetteStrength: 0.5,
    maxLightness: 20,
    hueShiftStrength: 0.55,
  },
  adriatic: {
    tileSize: 20,
    gap: 2,
    baseHue: [210, 228], baseSat: [18, 28], baseLight: [6, 10],
    lights: [
      { hueCenter: 190, hueJitter: 10, satBoost: 48, lightBoost: 10, radius: 320, falloff: 2.6 },
      { hueCenter: 210, hueJitter: 8,  satBoost: 42, lightBoost: 9,  radius: 280, falloff: 2.6 },
      { hueCenter: 200, hueJitter: 6,  satBoost: 45, lightBoost: 9,  radius: 300, falloff: 2.5 },
    ],
    vignetteStrength: 0.5,
    maxLightness: 18,
    hueShiftStrength: 0.6,
  },
  quartz: {
    tileSize: 24,
    gap: 2,
    baseHue: [0, 40], baseSat: [2, 6], baseLight: [10, 14],
    lights: [
      { hueCenter: 28, hueJitter: 10, satBoost: 16, lightBoost: 5, radius: 340, falloff: 2.9 },
      { hueCenter: 10, hueJitter: 6,  satBoost: 8,  lightBoost: 4, radius: 300, falloff: 3.0 },
      { hueCenter: 220, hueJitter: 8, satBoost: 10, lightBoost: 4, radius: 320, falloff: 2.9 },
    ],
    vignetteStrength: 0.45,
    maxLightness: 17,
    hueShiftStrength: 0.35,
  },
  osteria: {
    tileSize: 22,
    gap: 2,
    baseHue: [28, 40], baseSat: [20, 30], baseLight: [8, 12],
    lights: [
      { hueCenter: 40, hueJitter: 6, satBoost: 48, lightBoost: 10, radius: 220, falloff: 2.3 },
      { hueCenter: 34, hueJitter: 4, satBoost: 44, lightBoost: 9,  radius: 200, falloff: 2.4 },
    ],
    vignetteStrength: 0.55,
    maxLightness: 19,
    hueShiftStrength: 0.55,
  },
};

export function drawMorphTiles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  _palette: Palette,
  key: MorphVariantKey,
): void {
  const cfg = CONFIGS[key];
  const rng = mulberry32(seed);
  const noise = createNoise2D(seed ^ 0x9e3779b9);

  // Grout — showing through the tile gaps.
  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, w, h);

  const step = cfg.tileSize + cfg.gap;
  const cols = Math.ceil(w / step);
  const rows = Math.ceil(h / step);

  // Place light sources at seeded positions.
  const lights = cfg.lights.map((l) => ({
    cfg: l,
    x: range(rng, w * 0.1, w * 0.9),
    y: range(rng, h * 0.1, h * 0.9),
    hue: l.hueCenter + range(rng, -l.hueJitter, l.hueJitter),
  }));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tx = c * step;
      const ty = r * step;
      const cxp = tx + cfg.tileSize / 2;
      const cyp = ty + cfg.tileSize / 2;

      // Per-tile noise shift for organic variation even away from lights.
      const nx = noise(c * 0.085, r * 0.085);
      const t = (nx + 1) * 0.5;

      let hue = cfg.baseHue[0] + (cfg.baseHue[1] - cfg.baseHue[0]) * t;
      let sat = cfg.baseSat[0] + (cfg.baseSat[1] - cfg.baseSat[0]) * (1 - t);
      let lig = cfg.baseLight[0] + (cfg.baseLight[1] - cfg.baseLight[0]) * t;

      for (const l of lights) {
        const dx = cxp - l.x;
        const dy = cyp - l.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= l.cfg.radius) continue;
        const factor = Math.pow(1 - dist / l.cfg.radius, l.cfg.falloff);
        hue = hue + (l.hue - hue) * factor * cfg.hueShiftStrength;
        sat += l.cfg.satBoost * factor;
        lig += l.cfg.lightBoost * factor;
      }

      sat = Math.min(85, Math.max(0, sat));
      lig = Math.min(cfg.maxLightness, Math.max(0, lig));
      const hueNorm = ((hue % 360) + 360) % 360;

      ctx.fillStyle = `hsl(${hueNorm}, ${sat}%, ${lig}%)`;
      ctx.fillRect(tx, ty, cfg.tileSize, cfg.tileSize);
    }
  }

  // Vignette — skip on huge grids to save work.
  if (cols * rows < 3000) {
    const vGrad = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.3,
      w / 2, h / 2, Math.max(w, h) * 0.75,
    );
    vGrad.addColorStop(0, "rgba(0,0,0,0)");
    vGrad.addColorStop(1, `rgba(0,0,0,${cfg.vignetteStrength})`);
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, w, h);
  }
}
