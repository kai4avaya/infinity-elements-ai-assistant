import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

export default defineConfig({
  root: "agent-status-auto",
  plugins: [react(), cssInjectedByJsPlugin()],
  resolve: {
    alias: {
      "@avaya/infinity-elements-api": path.resolve(__dirname, "../ElementAPI/src"),
    },
  },
  build: {
    outDir: "../dist/agent-status-auto",
    emptyOutDir: true,
    lib: {
      entry: "./index.ts",
      formats: ["es", "umd"],
      name: "AgentStatusAuto",
      fileName: (format) => `agent-status-auto.${format}.js`,
    },
    rollupOptions: {
      external: [],
    },
  },
});
