// The single knob. URL params override at runtime for quick A/B:
//   ?bg=<variant> | off
//   ?seed=<integer>
// Users also cycle variants via the `B` easter-egg keyboard shortcut;
// that choice persists via localStorage (see GenerativeBackground).
export const BACKGROUND_VARIANTS = [
  "terrazzo",
  "vineyard",
  "passport",
  "polaroid",
  "tuscan",
  "morph-embers",
  "morph-adriatic",
  "morph-quartz",
  "morph-osteria",
] as const;

export type BackgroundVariant = (typeof BACKGROUND_VARIANTS)[number];

export function isBackgroundVariant(v: string | null | undefined): v is BackgroundVariant {
  return v != null && (BACKGROUND_VARIANTS as readonly string[]).includes(v);
}

export type BackgroundConfig = {
  enabled: boolean;
  variant: BackgroundVariant;
};

export const backgroundConfig: BackgroundConfig = {
  enabled: true,
  variant: "vineyard",
};
