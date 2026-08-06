import type { MetadataRoute } from "next";

/**
 * Web-App-Manifest (PWA). Next App Router serviert dies unter
 * /manifest.webmanifest und injiziert automatisch <link rel="manifest">.
 * Icons stammen aus dem zentralen BERENT-Set (asset-library/brand/icons),
 * kopiert nach public/icons. theme_color = BERENT-CI Warm Brown (#80331A).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BelegChat",
    short_name: "BelegChat",
    description: "Belegeingang, Kontierung und Freigabe — BERENT.AI",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#80331A",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
