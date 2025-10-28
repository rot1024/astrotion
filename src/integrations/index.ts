import child_process from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import type { AstroIntegration } from "astro";

import { ASSET_DIR, CACHE_DIR_ASSETS } from "../constants";

export default (): AstroIntegration => ({
  name: "astrotion",
  hooks: {
    "astro:config:setup": async ({ command }) => {
      fs.mkdirSync(CACHE_DIR_ASSETS, { recursive: true });

      // In dev mode, create symlink to public directory
      if (command === "dev") {
        const publicAssetDir = path.join("public", ASSET_DIR);

        // Remove existing symlink or directory
        if (fs.existsSync(publicAssetDir)) {
          fs.rmSync(publicAssetDir, { recursive: true });
          console.log(`astrotion: removed existing ${publicAssetDir}`);
        }

        // Create symlink
        const relativeTarget = path.relative(
          path.dirname(publicAssetDir),
          CACHE_DIR_ASSETS
        );
        fs.symlinkSync(relativeTarget, publicAssetDir, "dir");
        console.log(`astrotion: created symlink ${publicAssetDir} -> ${CACHE_DIR_ASSETS}`);
      }
    },
    "astro:build:start": async () => {
      fs.mkdirSync(CACHE_DIR_ASSETS, { recursive: true });
    },
    "astro:build:done": async ({ dir }) => {
      // only triggerd in build mode
      const outDir = new URL(ASSET_DIR, dir.href).pathname;
      fs.mkdirSync(outDir, { recursive: true });

      const command = `cp -n -r ${CACHE_DIR_ASSETS}/* ${outDir} || true`;
      console.log(`astrotion: copying assets: ${command}`);
      child_process.execSync(command);
    },
  },
});
