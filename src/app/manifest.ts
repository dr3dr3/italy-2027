import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Italia 2027",
    short_name: "Italia 2027",
    description: "A few friends, one trip.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf7f2",
    theme_color: "#c65d3a",
    categories: ["travel", "lifestyle"],
    icons: [
      {
        src: "/icon1",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon2",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
