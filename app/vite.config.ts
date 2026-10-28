import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Shortshi",
        short_name: "shortshi",
        theme_color: "#17131f",
        background_color: "#17131f",
        display: "standalone",
        icons: [
          { src: "/icons/192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: { navigateFallback: "/index.html" },
    }),
  ],
});
