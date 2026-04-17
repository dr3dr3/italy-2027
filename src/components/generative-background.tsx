"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { backgroundConfig, type BackgroundVariant } from "@/lib/background/config";
import { drawTerrazzo } from "@/lib/background/terrazzo";
import { drawVineyard } from "@/lib/background/vineyard";
import { resolvePalette } from "@/lib/background/palette";
import { randomSeed } from "@/lib/background/rng";

// Paint-to-image strategy: draw once into an offscreen canvas, snapshot to a
// data URL, apply as `background-image` on <body>, discard the canvas. Zero
// persistent DOM, zero ongoing CPU. Re-paint only on significant resize.

function pickDpr(width: number): number {
  if (width < 640) return 1;
  if (width >= 2000) return 1;
  return 1.5;
}

function draw(variant: BackgroundVariant, width: number, height: number, seed: number): string | null {
  const dpr = pickDpr(width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(dpr, dpr);

  const palette = resolvePalette();
  if (variant === "terrazzo") drawTerrazzo(ctx, width, height, seed, palette);
  else drawVineyard(ctx, width, height, seed, palette);

  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

function schedule(fn: () => void): () => void {
  const w = window as typeof window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(fn, { timeout: 500 });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(fn, 0);
  return () => window.clearTimeout(id);
}

export function GenerativeBackground() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;

    const params = new URLSearchParams(window.location.search);
    const paramBg = params.get("bg");
    if (paramBg === "off") return;
    if (!backgroundConfig.enabled && paramBg !== "terrazzo" && paramBg !== "vineyard") return;

    const variant: BackgroundVariant =
      paramBg === "terrazzo" || paramBg === "vineyard" ? paramBg : backgroundConfig.variant;

    const paramSeed = params.get("seed");
    const seed = paramSeed && /^-?\d+$/.test(paramSeed) ? Number(paramSeed) : randomSeed();

    const body = document.body;
    let lastWidth = 0;
    let lastOrientation: "portrait" | "landscape" = "landscape";
    let cancelSchedule: (() => void) | null = null;
    let resizeTimer: number | null = null;
    let cancelled = false;

    const paint = () => {
      if (cancelled) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const url = draw(variant, w, h, seed);
      if (!url || cancelled) return;
      body.style.backgroundImage = `url(${url})`;
      body.style.backgroundSize = "cover";
      body.style.backgroundRepeat = "no-repeat";
      body.style.backgroundAttachment = "fixed";
      body.style.backgroundPosition = "center";
      lastWidth = w;
      lastOrientation = w >= h ? "landscape" : "portrait";
    };

    cancelSchedule = schedule(paint);

    const onResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const orientation = w >= h ? "landscape" : "portrait";
        const widthDeltaRatio = lastWidth === 0 ? 1 : Math.abs(w - lastWidth) / lastWidth;
        if (orientation !== lastOrientation || widthDeltaRatio > 0.2) {
          cancelSchedule?.();
          cancelSchedule = schedule(paint);
        }
      }, 400);
    };

    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      cancelSchedule?.();
      if (resizeTimer) window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      body.style.backgroundImage = "";
      body.style.backgroundSize = "";
      body.style.backgroundRepeat = "";
      body.style.backgroundAttachment = "";
      body.style.backgroundPosition = "";
    };
  }, [pathname]);

  return null;
}
