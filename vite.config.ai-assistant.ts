import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

export default defineConfig({
  root: "ai_assistant",
  plugins: [react(), cssInjectedByJsPlugin()],
  build: {
    outDir: "../dist/ai_assistant",
    emptyOutDir: true,
    lib: {
      entry: "./index.ts",
      formats: ["es", "umd"],
      name: "AiAssistant",
      fileName: (format) => `ai-assistant.${format}.js`,
    },
    rollupOptions: {
      external: [],
    },
  },
});
