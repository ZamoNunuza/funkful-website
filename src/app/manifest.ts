import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Funkful",
    short_name: "Funkful",
    description: "Custom gifts and Scoopful mystery scoops - one cart, every brand.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF8F4",
    theme_color: "#FAF8F4",
    icons: [
      { src: "/assets/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/assets/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/assets/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
