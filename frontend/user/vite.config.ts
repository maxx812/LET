import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendOrigin = env.VITE_BACKEND_ORIGIN || "http://localhost:4000";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
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
    preview: {
      host: "127.0.0.1",
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined;
            }

            if (id.includes("firebase")) {
              return "firebase";
            }
            if (id.includes("recharts") || id.includes("d3-")) {
              return "charts";
            }
            if (id.includes("@tanstack")) {
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
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});
