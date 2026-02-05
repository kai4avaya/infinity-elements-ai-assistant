import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "oauth",
  plugins: [react()],
  build: {
    outDir: "../dist/oauth",
    emptyOutDir: true,
    lib: {
      entry: "./index.ts",
      formats: ["es", "umd"],
      name: "OAuthDemo",
      fileName: (format) => `oauth.${format}.js`,
    },
    rollupOptions: {
      external: [],
    },
  },
});
