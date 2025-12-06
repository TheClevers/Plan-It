import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    port: 5173,                 // ✅ HARD CODED FOR DEV ONLY
    strictPort: true,

    allowedHosts: ["plan-it-dkbz.onrender.com"],

    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  preview: {
    host: "0.0.0.0",
    port: 4173,                 // ✅ HARD CODED FOR PREVIEW
    strictPort: true,

    allowedHosts: ["plan-it-dkbz.onrender.com"],
  },
});
