import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL("./github-pages/", import.meta.url)),
  base: "/gutbrains-holidays/",
  publicDir: fileURLToPath(new URL("./public/", import.meta.url)),
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  build: {
    outDir: fileURLToPath(new URL("./docs/", import.meta.url)),
    emptyOutDir: true,
  },
});
