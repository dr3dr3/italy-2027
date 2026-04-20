// Passport Stamps — aged paper (warmCream → parchment) with procedurally
// scattered rubber-stamp marks. Ink tones pulled from DESIGN.md accents
// (wine, terracotta, olive, ink, sienna) — no hardcoded hex. Alpha
// variation simulates worn stamps. Static: draws once per (seed, size).
import { mulberry32, pick, range } from "./rng";
import type { Palette } from "./palette";

const CITIES = [
  "ROMA", "FIRENZE", "VENEZIA", "NAPOLI", "MILANO", "PALERMO",
  "SIENA", "BOLOGNA", "VERONA", "AMALFI", "PISA", "TORINO",
] as const;

function stampDate(rng: () => number): string {
  const month = 1 + Math.floor(rng() * 12);
  const day = 1 + Math.floor(rng() * 28);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${dd}.${mm}.2027`;
}

export function drawPassport(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  palette: Palette,
): void {
  const rng = mulberry32(seed);

  // Aged paper base — subtle vertical gradient.
  const paper = ctx.createLinearGradient(0, 0, 0, h);
  paper.addColorStop(0, palette.warmCream);
  paper.addColorStop(1, palette.parchment);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);

  // Faint horizontal ruled lines.
  ctx.strokeStyle = palette.ink;
  ctx.globalAlpha = 0.05;
  ctx.lineWidth = 0.5;
  for (let y = 40; y < h; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // ITALIA watermark — rotated, very low opacity.
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.35);
  ctx.font = `900 ${Math.min(w, h) * 0.25}px 'Courier New', 'Menlo', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = palette.ink;
  ctx.globalAlpha = 0.04;
  ctx.fillText("ITALIA", 0, 0);
  ctx.restore();

  // Subtle ink smudges beneath the stamps.
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = palette.ink;
  const smudgeCount = Math.round((w * h) / 30000);
  for (let i = 0; i < smudgeCount; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const rx = range(rng, 20, 50);
    const ry = range(rng, 6, 18);
    const rot = rng() * Math.PI;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Ink tones — design-system accents read as faded rubber stamp ink
  // once alpha drops below 1.
  const inkTones = [
    palette.wine,
    palette.terracotta,
    palette.olive,
    palette.ink,
    palette.sienna,
  ] as const;

  const stampCount = Math.max(12, Math.min(18, Math.round((w * h) / 60000)));

  for (let i = 0; i < stampCount; i++) {
    const cx = rng() * w;
    const cy = rng() * h;
    const rot = range(rng, -0.35, 0.35);
    const ink = pick(rng, inkTones);
    // Faded range keeps stamps legible on their own but lets overlaid
    // app text stay readable where the two intersect.
    const alpha = range(rng, 0.22, 0.5);
    const shape = rng();
    const city = pick(rng, CITIES);
    const date = stampDate(rng);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineWidth = 1.4;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (shape < 0.45) {
      // Circular double-ring.
      const r = range(rng, 42, 58);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r - 5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = "bold 11px 'Courier New', monospace";
      ctx.fillText(city, 0, -r + 18);
      ctx.font = "10px 'Courier New', monospace";
      ctx.fillText(date, 0, 0);
      ctx.font = "bold 9px 'Courier New', monospace";
      ctx.fillText("ITALIA", 0, r - 16);

      ctx.font = "10px 'Courier New', monospace";
      ctx.fillText("★", -r + 14, 0);
      ctx.fillText("★", r - 14, 0);
    } else if (shape < 0.78) {
      // Rectangular double-border.
      const rw = range(rng, 96, 130);
      const rh = range(rng, 34, 46);
      ctx.strokeRect(-rw / 2, -rh / 2, rw, rh);
      ctx.strokeRect(-rw / 2 + 3, -rh / 2 + 3, rw - 6, rh - 6);
      ctx.font = "bold 12px 'Courier New', monospace";
      ctx.fillText(city, 0, -4);
      ctx.font = "10px 'Courier New', monospace";
      ctx.fillText(date, 0, 11);
    } else {
      // Oval INGRESSO (entry) stamp.
      const rx = range(rng, 60, 78);
      const ry = range(rng, 30, 40);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, rx - 4, ry - 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = "bold 10px 'Courier New', monospace";
      ctx.fillText("INGRESSO", 0, -11);
      ctx.font = "11px 'Courier New', monospace";
      ctx.fillText(city, 0, 3);
      ctx.font = "9px 'Courier New', monospace";
      ctx.fillText(date, 0, 16);
    }

    ctx.restore();
  }

  ctx.globalAlpha = 1;
}
