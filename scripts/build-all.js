#!/usr/bin/env node

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json
const pkgPath = join(__dirname, "..", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

// Find all build scripts
const buildScripts = Object.keys(pkg.scripts)
  .filter((script) => script.startsWith("build:") && script !== "build-all")
  .map((script) => `npm run ${script}`)
  .join(" && ");

if (!buildScripts) {
  console.log("No build scripts found");
  process.exit(0);
}

// Run all build scripts
try {
  execSync(buildScripts, { stdio: "inherit" });
} catch (error) {
  process.exit(error.status || 1);
}
