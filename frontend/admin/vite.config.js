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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("recharts") || id.includes("d3-")) {
            return "charts";
          }
          if (id.includes("react-router")) {
            return "router";
          }
          if (id.includes("lucide-react")) {
            return "icons";
          }
          if (id.includes("axios") || id.includes("socket.io-client")) {
            return "network";
          }

          return "vendor";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
