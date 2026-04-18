// The single knob. URL params override at runtime for quick A/B:
//   ?bg=terrazzo | vineyard | off
//   ?seed=<integer>
export type BackgroundVariant = "terrazzo" | "vineyard";

export type BackgroundConfig = {
  enabled: boolean;
  variant: BackgroundVariant;
};

export const backgroundConfig: BackgroundConfig = {
  enabled: true,
  variant: "vineyard",
};
