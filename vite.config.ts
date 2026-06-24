import { defineConfig } from "vite";

// GitHub Pages 하위 경로 배포 시 BASE_PATH로 base 지정.
// (예: BASE_PATH=/my-repo/ npm run build) — 미설정 시 루트("/").
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  server: {
    host: true,
    port: 5173,
  },
});
