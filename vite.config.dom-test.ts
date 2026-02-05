import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "dom-test",
  plugins: [react()],
  build: {
    outDir: "../dist/dom-test",
    emptyOutDir: true,
    lib: {
      entry: "./index.ts",
      formats: ["es", "umd"],
      name: "DomTestCard",
      fileName: (format) => `dom-test.${format}.js`,
    },
    rollupOptions: {
      external: [],
    },
  },
});
