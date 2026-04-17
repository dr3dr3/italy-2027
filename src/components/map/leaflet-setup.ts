import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

type MaybeImage = string | { src: string };
const resolve = (m: MaybeImage) => (typeof m === "string" ? m : m.src);

L.Icon.Default.mergeOptions({
  iconUrl: resolve(iconUrl),
  iconRetinaUrl: resolve(iconRetinaUrl),
  shadowUrl: resolve(shadowUrl),
});

// Keep in sync with design-system.md — Leaflet's canvas renderer can't read CSS vars.
export const MAP_COLOURS = {
  terracotta: "#c65d3a",
  olive: "#6b7a3f",
  wine: "#7a2e2e",
  ink: "#1a1a1a",
  dust: "#e8e2d5",
} as const;
