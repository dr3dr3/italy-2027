// Polaroid Scatter — photo frames on a dark, warm corkboard. Palette
// derived from DESIGN.md tokens: ink (mixed with sienna for warmth) for
// the board, cream/warmCream for frames, terracotta/olive/ochre/wine/
// sienna/dust combos for photo colour blocks. Static: draws once.
import { mulberry32, pick, range } from "./rng";
import { mixColor } from "./mix";
import type { Palette } from "./palette";

const CAPTIONS = [
  "Roma ♡", "sunset vibes", "best crew", "la dolce vita",
  "gelato time", "lost in Venice", "Firenze nights", "squad goals",
  "aperitivo hour", "villa life", "road trip!", "Amalfi coast",
  "espresso o'clock", "ciao bella",
] as const;

export function drawPolaroid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  palette: Palette,
): void {
  const rng = mulberry32(seed);

  // Light sandstone corkboard — dust warmed slightly with sienna. Keeps
  // the photos reading as the focal point and harmonises with cream/
  // parchment elsewhere in the design system.
  const board = mixColor(palette.dust, palette.sienna, 0.1);
  ctx.fillStyle = board;
  ctx.fillRect(0, 0, w, h);

  // Noise texture — subtle warm grain for the cork feel.
  const grainCount = Math.round((w * h) / 500);
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = palette.sienna;
  for (let i = 0; i < grainCount; i++) {
    ctx.fillRect(rng() * w, rng() * h, 1, 1);
  }
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = palette.ochre;
  for (let i = 0; i < grainCount / 2; i++) {
    ctx.fillRect(rng() * w, rng() * h, 1, 1);
  }
  ctx.globalAlpha = 1;

  // Photo palettes — each [sky, ground, accent] triplet from DESIGN.md.
  const photoPalettes = [
    [palette.terracotta, palette.olive, palette.ochre],
    [palette.wine, palette.sienna, palette.parchment],
    [palette.olive, palette.dust, palette.warmCream],
    [palette.ochre, palette.terracotta, palette.wine],
    [palette.warmCream, palette.olive, palette.sienna],
    [palette.dust, palette.sienna, palette.terracotta],
  ] as const;

  const frameCount = Math.max(10, Math.min(14, Math.round((w * h) / 90000)));

  for (let i = 0; i < frameCount; i++) {
    const size = range(rng, 130, 180);
    const frameW = size;
    const frameH = size * 1.18;
    const cx = range(rng, frameW * 0.5, w - frameW * 0.5);
    const cy = range(rng, frameH * 0.5, h - frameH * 0.5);
    const rot = range(rng, -0.25, 0.25);
    const inset = 9;
    const photoW = frameW - inset * 2;
    const photoH = photoW; // square photo
    const photoTop = -frameH / 2 + inset;
    const photoLeft = -frameW / 2 + inset;
    const captionY = photoTop + photoH + (frameH / 2 - photoTop - photoH) / 2;
    const pal = pick(rng, photoPalettes);
    const caption = pick(rng, CAPTIONS);

    // Warmth variation on frame — lerp between cream and warmCream.
    const frameColour = mixColor(palette.cream, palette.warmCream, rng());

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    // Shadow — softer against the light board than against dark ink.
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#000";
    ctx.fillRect(-frameW / 2 + 5, -frameH / 2 + 7, frameW, frameH);

    ctx.globalAlpha = 1;
    ctx.fillStyle = frameColour;
    ctx.fillRect(-frameW / 2, -frameH / 2, frameW, frameH);

    // Photo area (clipped).
    ctx.save();
    ctx.beginPath();
    ctx.rect(photoLeft, photoTop, photoW, photoH);
    ctx.clip();

    // Sky.
    const skyH = photoH * 0.55;
    ctx.fillStyle = pal[0];
    ctx.fillRect(photoLeft, photoTop, photoW, skyH);

    // Ground via Bézier horizon.
    const horizonY = photoTop + skyH;
    ctx.fillStyle = pal[1];
    ctx.beginPath();
    ctx.moveTo(photoLeft, horizonY);
    ctx.bezierCurveTo(
      photoLeft + photoW * 0.35, horizonY + range(rng, -14, 10),
      photoLeft + photoW * 0.7, horizonY + range(rng, -10, 14),
      photoLeft + photoW, horizonY,
    );
    ctx.lineTo(photoLeft + photoW, photoTop + photoH);
    ctx.lineTo(photoLeft, photoTop + photoH);
    ctx.closePath();
    ctx.fill();

    // Accent silhouette (tree/building-ish).
    const accentX = range(rng, photoLeft + photoW * 0.15, photoLeft + photoW * 0.85);
    const accentW = range(rng, 22, 48);
    const accentH = range(rng, 26, 60);
    ctx.fillStyle = pal[2];
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(accentX - accentW / 2, horizonY);
    ctx.bezierCurveTo(
      accentX - accentW / 2, horizonY - accentH,
      accentX + accentW / 2, horizonY - accentH,
      accentX + accentW / 2, horizonY,
    );
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Light leak overlay.
    const leakGrad = ctx.createLinearGradient(
      photoLeft, photoTop,
      photoLeft + photoW, photoTop + photoH,
    );
    const leakColour = pick(rng, [palette.ochre, palette.terracotta, palette.wine] as const);
    leakGrad.addColorStop(0, "rgba(0,0,0,0)");
    leakGrad.addColorStop(range(rng, 0.4, 0.7), leakColour);
    leakGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = range(rng, 0.1, 0.22);
    ctx.fillStyle = leakGrad;
    ctx.fillRect(photoLeft, photoTop, photoW, photoH);
    ctx.globalAlpha = 1;

    ctx.restore(); // photo clip

    // Caption.
    ctx.fillStyle = palette.ink;
    ctx.globalAlpha = 0.8;
    ctx.font = "italic 15px 'Georgia', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(caption, 0, captionY);
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // Push pins — sit on top of everything.
  const pinCount = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < pinCount; i++) {
    const x = range(rng, 30, w - 30);
    const y = range(rng, 30, h - 30);
    const r = range(rng, 5, 7);
    const pinColour = pick(rng, [palette.terracotta, palette.wine, palette.ochre, palette.olive] as const);

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(x + 2, y + 3, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = pinColour;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
