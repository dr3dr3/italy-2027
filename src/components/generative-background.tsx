"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  backgroundConfig,
  BACKGROUND_VARIANTS,
  isBackgroundVariant,
  type BackgroundVariant,
} from "@/lib/background/config";
import { drawTerrazzo } from "@/lib/background/terrazzo";
import { drawVineyard } from "@/lib/background/vineyard";
import { drawPassport } from "@/lib/background/passport";
import { drawPolaroid } from "@/lib/background/polaroid";
import { drawTuscan } from "@/lib/background/tuscan";
import { drawMorphTiles } from "@/lib/background/morph-tiles";
import { resolvePalette } from "@/lib/background/palette";
import { randomSeed } from "@/lib/background/rng";

// Paint-to-image strategy: draw once into an offscreen canvas, snapshot to a
// data URL, apply as `background-image` on <body>, discard the canvas. Zero
// persistent DOM, zero ongoing CPU. Re-paint only on significant resize or
// when the user cycles variants via the `B` easter-egg shortcut.

const STORAGE_KEY = "bg.variant";

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
  switch (variant) {
    case "terrazzo":       drawTerrazzo(ctx, width, height, seed, palette); break;
    case "vineyard":       drawVineyard(ctx, width, height, seed, palette); break;
    case "passport":       drawPassport(ctx, width, height, seed, palette); break;
    case "polaroid":       drawPolaroid(ctx, width, height, seed, palette); break;
    case "tuscan":         drawTuscan(ctx, width, height, seed, palette); break;
    case "morph-embers":   drawMorphTiles(ctx, width, height, seed, palette, "embers"); break;
    case "morph-adriatic": drawMorphTiles(ctx, width, height, seed, palette, "adriatic"); break;
    case "morph-quartz":   drawMorphTiles(ctx, width, height, seed, palette, "quartz"); break;
    case "morph-osteria":  drawMorphTiles(ctx, width, height, seed, palette, "osteria"); break;
  }

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

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

// Taps that land on interactive elements should never cycle — a triple-
// tap on a button must stay a triple-click, not an accidental reshuffle.
function isInteractiveTarget(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  return el.closest(
    "a, button, input, textarea, select, label, summary, [role='button'], [role='link'], [contenteditable='true']",
  ) != null;
}

const TAP_WINDOW_MS = 500;
const TAP_RADIUS_PX = 40;
const TAP_DRAG_THRESHOLD_PX = 10;

type RuntimeState = { variant: BackgroundVariant; seed: number };

export function GenerativeBackground() {
  const pathname = usePathname();
  const [state, setState] = useState<RuntimeState | null>(null);
  const stateRef = useRef<RuntimeState | null>(null);
  stateRef.current = state;

  // Initialize / re-initialize on route change (picks up URL param overrides).
  useEffect(() => {
    if (pathname?.startsWith("/admin")) {
      setState(null);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const paramBg = params.get("bg");
    if (paramBg === "off") {
      setState(null);
      return;
    }

    let variant: BackgroundVariant;
    if (isBackgroundVariant(paramBg)) {
      variant = paramBg;
    } else {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(STORAGE_KEY);
      } catch {
        // localStorage may be blocked (private mode, storage partitioning).
      }
      if (!backgroundConfig.enabled && !isBackgroundVariant(stored)) {
        setState(null);
        return;
      }
      variant = isBackgroundVariant(stored) ? stored : backgroundConfig.variant;
    }

    const paramSeed = params.get("seed");
    const seed = paramSeed && /^-?\d+$/.test(paramSeed) ? Number(paramSeed) : randomSeed();
    setState({ variant, seed });
  }, [pathname]);

  // Easter eggs: press `B` on desktop, triple-tap on mobile (outside any
  // interactive element) to cycle variant + reroll seed.
  useEffect(() => {
    const cycle = () => {
      if (!stateRef.current) return;
      setState((prev) => {
        if (!prev) return prev;
        const idx = BACKGROUND_VARIANTS.indexOf(prev.variant);
        const next = BACKGROUND_VARIANTS[(idx + 1) % BACKGROUND_VARIANTS.length];
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // ignore
        }
        return { variant: next, seed: randomSeed() };
      });
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "b" && e.key !== "B") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (!stateRef.current) return;
      e.preventDefault();
      cycle();
    };

    // Triple-tap: collect up to two prior taps, fire on the third if all
    // three landed within TAP_WINDOW_MS and TAP_RADIUS_PX of each other.
    // Scrolls/drags are filtered by comparing touchstart→touchend delta.
    let tapStart: { x: number; y: number } | null = null;
    const taps: Array<{ t: number; x: number; y: number }> = [];

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) { tapStart = null; return; }
      const t = e.changedTouches[0];
      tapStart = t ? { x: t.clientX, y: t.clientY } : null;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length > 0) return; // another finger still down
      const start = tapStart;
      tapStart = null;
      if (!start) return;
      if (!stateRef.current) return;
      if (isInteractiveTarget(e.target)) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.hypot(dx, dy) > TAP_DRAG_THRESHOLD_PX) return;

      const now = performance.now();
      // Drop taps outside the window.
      while (taps.length > 0 && now - taps[0].t > TAP_WINDOW_MS) taps.shift();

      const here = { t: now, x: t.clientX, y: t.clientY };
      if (taps.length >= 2) {
        const inRadius = taps.every(
          (p) => Math.hypot(p.x - here.x, p.y - here.y) <= TAP_RADIUS_PX,
        );
        if (inRadius) {
          taps.length = 0;
          cycle();
          return;
        }
      }
      taps.push(here);
      if (taps.length > 2) taps.splice(0, taps.length - 2);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // Paint on variant/seed change; handle resize.
  useEffect(() => {
    const body = document.body;
    if (!state) {
      body.style.backgroundImage = "";
      body.style.backgroundSize = "";
      body.style.backgroundRepeat = "";
      body.style.backgroundAttachment = "";
      body.style.backgroundPosition = "";
      return;
    }

    const { variant, seed } = state;
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
    };
  }, [state]);

  return null;
}
