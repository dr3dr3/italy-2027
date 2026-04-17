// Palette tokens. Design-system colours are resolved from CSS vars at runtime
// so the background tracks theme changes. The stone-tone extras (sienna,
// ochre, warm-cream, parchment) fill out the Italian-stone range without
// polluting the design-system palette itself.

function readVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function resolvePalette() {
  return {
    ink: readVar("--ink", "#1a1a1a"),
    cream: readVar("--cream", "#faf7f2"),
    terracotta: readVar("--terracotta", "#c65d3a"),
    olive: readVar("--olive", "#6b7a3f"),
    dust: readVar("--dust", "#e8e2d5"),
    wine: readVar("--wine", "#7a2e2e"),
    sienna: "#a0522d",
    ochre: "#c99a3f",
    warmCream: "#f2ead9",
    parchment: "#f0e6cf",
  } as const;
}

export type Palette = ReturnType<typeof resolvePalette>;
