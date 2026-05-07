import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // The site is served at /demos/exeter/ on reaction.org.uk
  base: "/demos/exeter/",
  build: {
    // Output goes into the Next.js project's public folder so Vercel serves it
    outDir: path.resolve(__dirname, "../../public/demos/exeter"),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
});
