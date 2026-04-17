// Terrazzo — irregular stone chips scattered on a warm base, shards on top,
// fine speckles to finish. Static: draws once per (seed, size).
import { mulberry32, pick, range } from "./rng";
import type { Palette } from "./palette";

export function drawTerrazzo(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  palette: Palette,
): void {
  const rng = mulberry32(seed);

  ctx.fillStyle = palette.warmCream;
  ctx.fillRect(0, 0, w, h);

  const chipColours = [
    palette.terracotta,
    palette.olive,
    palette.sienna,
    palette.ochre,
    palette.dust,
    palette.wine,
    palette.cream,
  ] as const;

  // Chip density ~ 1 per 3500px² so the look scales with viewport.
  const chipCount = Math.round((w * h) / 3500);

  for (let i = 0; i < chipCount; i++) {
    const cx = rng() * w;
    const cy = rng() * h;
    const radius = range(rng, 6, 26);
    const verts = 5 + Math.floor(rng() * 5);
    const rot = rng() * Math.PI * 2;
    const colour = pick(rng, chipColours);

    ctx.beginPath();
    for (let v = 0; v < verts; v++) {
      const a = rot + (v / verts) * Math.PI * 2;
      const r = radius * range(rng, 0.6, 1.15);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (v === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    ctx.globalAlpha = range(rng, 0.55, 0.85);
    ctx.fillStyle = colour;
    ctx.fill();

    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Elongated shards — thin rotated ellipses, fewer but more visible.
  const shardCount = Math.round((w * h) / 18000);
  for (let i = 0; i < shardCount; i++) {
    const cx = rng() * w;
    const cy = rng() * h;
    const rx = range(rng, 10, 38);
    const ry = range(rng, 1.2, 3.5);
    const rot = rng() * Math.PI;
    const colour = pick(rng, chipColours);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.globalAlpha = range(rng, 0.35, 0.6);
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Fine speckles, ink dots.
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = palette.ink;
  const speckleCount = Math.round((w * h) / 900);
  for (let i = 0; i < speckleCount; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = rng() < 0.85 ? 0.6 : 1.1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}
