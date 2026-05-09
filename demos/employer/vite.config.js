import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Production URL prefix — must match the gated route in the Next.js app
  base: "/demo-app/employer/",
  build: {
    // Output goes into private-demos/ (NOT public/) so Vercel doesn't auto-serve it.
    // Files are read by the gated route handler at /demo-app/[slug]/[[...path]]/route.ts
    outDir: path.resolve(__dirname, "../../private-demos/employer"),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
});
