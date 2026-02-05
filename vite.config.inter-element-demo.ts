import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "inter-element-demo",
  plugins: [react()],
  build: {
    outDir: "../dist/inter-element-demo",
    emptyOutDir: true,
    lib: {
      entry: "./index.ts",
      formats: ["es", "umd"],
      name: "InterElementDemo",
      fileName: (format) => `inter-element-demo.${format}.js`,
    },
    rollupOptions: {
      external: [],
    },
  },
});
