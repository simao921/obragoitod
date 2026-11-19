import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:4000";

const allowedHosts = ["localhost", "127.0.0.1", ".local"];
if (process.env.BASE44_PREVIEW_MODE === "1" && process.env.BASE44_SANDBOX_HOST_DOMAIN) {
  allowedHosts.push(`.${process.env.BASE44_SANDBOX_HOST_DOMAIN}`);
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: Number(process.env.ADMIN_PORT ?? 3001),
    strictPort: true,
    allowedHosts,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: false },
      "/media": { target: apiTarget, changeOrigin: false },
    },
  },
  preview: { host: "0.0.0.0", port: 3001 },
  build: { outDir: "dist", sourcemap: false },
});
