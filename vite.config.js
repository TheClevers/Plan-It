import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "5173"),
    allowedHosts: ["i-made-it.onrender.com"],
  
  //백엔드 연결용 포트 연결
  proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
    }
  },
  preview: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "4173"),
    allowedHosts: ["i-made-it.onrender.com"],
    
    //백엔드 연결용 포트 연결
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
    },
  }
});
