import { fileURLToPath, URL } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const backendOrigin = process.env.VITE_BACKEND_ORIGIN || "http://localhost:4000";

export default defineConfig(({ command }) => ({
  plugins: [
    ...(command === "build" ? [cloudflare({ viteEnvironment: { name: "ssr" } })] : []),
    tanstackStart(),
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      "/api": {
        target: backendOrigin,
        changeOrigin: true,
      },
      "/socket.io": {
        target: backendOrigin,
        ws: true,
        changeOrigin: true,
      },
      "/health": {
        target: backendOrigin,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
}));
