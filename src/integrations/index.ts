import child_process from "node:child_process";
import fs from "node:fs";

import type { AstroIntegration } from "astro";

import { ASSET_DIR, CACHE_DIR_ASSETS } from "../constants";

export default (): AstroIntegration => ({
  name: "astrotion",
  hooks: {
    "astro:build:start": async () => {
      fs.mkdirSync(CACHE_DIR_ASSETS, { recursive: true });
    },
    "astro:build:done": async ({ dir }) => {
      const outDir = new URL(ASSET_DIR, dir.href).pathname;
      fs.mkdirSync(outDir, { recursive: true });

      const command = `cp -n -r ${CACHE_DIR_ASSETS}/* ${outDir} || true`;
      console.log(`astrotion: copying assets: ${command}`);
      child_process.execSync(command);
    },
  },
});
