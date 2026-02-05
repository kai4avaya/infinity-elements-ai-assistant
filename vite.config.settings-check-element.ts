import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import path from "path";

export default defineConfig({
  plugins: [react(), cssInjectedByJsPlugin()],
  build: {
    lib: {
      entry: path.resolve(__dirname, "settings-check-element/index.ts"),
      name: "SettingsCheckElement",
      fileName: (format) => `settings-check-element.${format}.js`,
    },
    rollupOptions: {
      external: [], 
    },
    outDir: "dist/settings-check-element",
  },
});
