import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

export default defineConfig({
  root: "api-demo",
  plugins: [react(), cssInjectedByJsPlugin()],
  build: {
    outDir: "../dist/api-demo",
    emptyOutDir: true,
    lib: {
      entry: "./index.ts",
      formats: ["es", "umd"],
      name: "ApiDemo",
      fileName: (format) => `api-demo.${format}.js`,
    },
    rollupOptions: {
      external: [],
    },
  },
});
