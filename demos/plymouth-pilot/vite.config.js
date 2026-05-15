import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Production URL prefix — must match the gated route in the Next.js app: /demo-app/plymouth-pilot/
  base: "/demo-app/plymouth-pilot/",
  build: {
    // Output goes into private-demos/ (NOT public/) so Vercel doesn't auto-serve it.
    // Files are read by the gated route handler at /demo-app/[slug]/[[...path]]/route.ts
    outDir: path.resolve(__dirname, "../../private-demos/plymouth-pilot"),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    // Different from the sales demo (5173) so both can run with `npm run dev` simultaneously
    // without colliding on the port.
    port: 5174,
  },
});
