import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const backendOrigin = process.env.VITE_BACKEND_ORIGIN || "http://localhost:4000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3001,
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
      "@": "/src",
    },
  },
});
