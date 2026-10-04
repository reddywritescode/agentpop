import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// The UI never falls back to mock data. Local development either sets
// VITE_API_URL explicitly or uses these same-origin proxies to the real stack.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/v1": "http://127.0.0.1:8088",
      "/private": "http://127.0.0.1:8088",
      "/preview": "http://127.0.0.1:8088",
      "/healthz": "http://127.0.0.1:8088",
    },
  },
});
