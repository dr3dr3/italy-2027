// Vineyard — simplex noise sampled on a grid, contour lines extracted via
// marching squares, then vineyard-row dot bands and a handful of wine-town
// labels layered on top. Parchment palette. Static: draws once.
import { mulberry32, pick, range } from "./rng";
import { createNoise2D } from "./noise";
import { VILLAGES } from "./villages";
import type { Palette } from "./palette";

const GRID_STEP = 8;
const CONTOUR_LEVELS = [-0.55, -0.3, -0.05, 0.2, 0.45, 0.7];

export function drawVineyard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  palette: Palette,
): void {
  const rng = mulberry32(seed);
  const noise = createNoise2D(seed);

  // Parchment base — slight vertical gradient from warm-cream to parchment
  // so it doesn't feel flat.
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, palette.warmCream);
  grad.addColorStop(1, palette.parchment);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Sample a low-frequency noise field.
  const cols = Math.ceil(w / GRID_STEP) + 1;
  const rows = Math.ceil(h / GRID_STEP) + 1;
  const field = new Float32Array(cols * rows);
  const freq = 1 / 220; // large, rolling hills
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      field[r * cols + c] = noise(c * GRID_STEP * freq, r * GRID_STEP * freq);
    }
  }

  // Contour lines via marching squares. One pass per threshold.
  ctx.strokeStyle = palette.olive;
  ctx.lineWidth = 0.9;
  ctx.globalAlpha = 0.28;
  ctx.lineCap = "round";
  for (const level of CONTOUR_LEVELS) {
    ctx.beginPath();
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const tl = field[r * cols + c];
        const tr = field[r * cols + c + 1];
        const br = field[(r + 1) * cols + c + 1];
        const bl = field[(r + 1) * cols + c];
        let idx = 0;
        if (tl > level) idx |= 1;
        if (tr > level) idx |= 2;
        if (br > level) idx |= 4;
        if (bl > level) idx |= 8;
        if (idx === 0 || idx === 15) continue;

        const x0 = c * GRID_STEP;
        const y0 = r * GRID_STEP;
        const interp = (a: number, b: number) => (level - a) / (b - a);

        const top = { x: x0 + interp(tl, tr) * GRID_STEP, y: y0 };
        const right = { x: x0 + GRID_STEP, y: y0 + interp(tr, br) * GRID_STEP };
        const bottom = { x: x0 + interp(bl, br) * GRID_STEP, y: y0 + GRID_STEP };
        const left = { x: x0, y: y0 + interp(tl, bl) * GRID_STEP };

        const seg = (a: { x: number; y: number }, b: { x: number; y: number }) => {
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        };

        switch (idx) {
          case 1: case 14: seg(left, top); break;
          case 2: case 13: seg(top, right); break;
          case 3: case 12: seg(left, right); break;
          case 4: case 11: seg(right, bottom); break;
          case 6: case 9:  seg(top, bottom); break;
          case 7: case 8:  seg(left, bottom); break;
          case 5: seg(left, top); seg(right, bottom); break;
          case 10: seg(top, right); seg(left, bottom); break;
        }
      }
    }
    ctx.stroke();
  }

  // Vineyard rows — parallel dotted bands in a few patches, masked by a
  // second low-freq noise so they cluster rather than cover the canvas.
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = palette.olive;
  const patchCount = 5 + Math.floor(rng() * 3);
  for (let p = 0; p < patchCount; p++) {
    const cx = rng() * w;
    const cy = rng() * h;
    const patchW = range(rng, 180, 340);
    const patchH = range(rng, 120, 220);
    const rot = range(rng, -0.5, 0.5);
    const rowSpacing = range(rng, 10, 16);
    const dotSpacing = range(rng, 5, 8);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    for (let y = -patchH / 2; y <= patchH / 2; y += rowSpacing) {
      for (let x = -patchW / 2; x <= patchW / 2; x += dotSpacing) {
        // Ellipsoidal falloff so patches blend at their edges.
        const falloff = 1 - (x * x) / ((patchW / 2) ** 2) - (y * y) / ((patchH / 2) ** 2);
        if (falloff <= 0) continue;
        if (rng() > falloff * 0.85) continue;
        ctx.beginPath();
        ctx.arc(x, y, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Village labels — picked from VILLAGES, placed with minimum spacing so
  // they don't overlap. Rendered in Fraunces italic if loaded, otherwise serif.
  const labelCount = 5 + Math.floor(rng() * 3);
  const placed: Array<{ x: number; y: number }> = [];
  const minDist = Math.min(w, h) * 0.22;

  // Labels in olive at low alpha — soft enough that overlaid app text
  // stays readable even when it crosses a village name.
  ctx.font = "italic 13px 'Fraunces', 'Georgia', serif";
  ctx.fillStyle = palette.olive;
  ctx.textBaseline = "middle";

  const used = new Set<string>();
  let attempts = 0;
  while (placed.length < labelCount && attempts < 200) {
    attempts++;
    const name = pick(rng, VILLAGES);
    if (used.has(name)) continue;
    const x = range(rng, 60, w - 60);
    const y = range(rng, 60, h - 60);
    let ok = true;
    for (const q of placed) {
      const dx = q.x - x;
      const dy = q.y - y;
      if (dx * dx + dy * dy < minDist * minDist) { ok = false; break; }
    }
    if (!ok) continue;
    placed.push({ x, y });
    used.add(name);

    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.fillText(name, x + 6, y);
  }

  ctx.globalAlpha = 1;
}
