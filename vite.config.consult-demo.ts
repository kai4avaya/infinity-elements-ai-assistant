import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "consult-demo",
  plugins: [react()],
  resolve: {
    alias: {
      "@avaya/infinity-elements-api": path.resolve(__dirname, "../ElementAPI/src"),
    },
  },
  build: {
    outDir: "../dist/consult-demo",
    emptyOutDir: true,
    lib: {
      entry: "./index.ts",
      formats: ["es", "umd"],
      name: "ConsultDemo",
      fileName: (format) => `consult-demo.${format}.js`,
    },
    rollupOptions: {
      external: [],
    },
  },
});

