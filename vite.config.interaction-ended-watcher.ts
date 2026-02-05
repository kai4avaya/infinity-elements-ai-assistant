import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "interaction-ended-watcher",
  plugins: [react()],
  resolve: {
    alias: {
      "@avaya/infinity-elements-api": path.resolve(__dirname, "../ElementAPI/src"),
    },
  },
  build: {
    outDir: "../dist/interaction-ended-watcher",
    emptyOutDir: true,
    lib: {
      entry: "./index.ts",
      formats: ["es", "umd"],
      name: "InteractionEndedWatcher",
      fileName: (format) => `interaction-ended-watcher.${format}.js`,
    },
    rollupOptions: {
      external: [],
    },
  },
});
