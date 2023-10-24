import child_process from "node:child_process";
import fs from "node:fs";

import type { AstroIntegration } from "astro";

import { debug } from "../utils";

const assetsDir = ".astro/.astrotion/static";
const assetDirName = "static";

export default (): AstroIntegration => ({
  name: "astrotion",
  hooks: {
    "astro:build:done": async ({ dir }) => {
      const outDir = new URL(assetDirName, dir.href).pathname;
      fs.mkdirSync(outDir, { recursive: true });

      const command = `cp -n -r ${assetsDir}/* ${outDir} || true`;
      debug(`copying assets: ${command}`);
      child_process.execSync(command);
    },
  },
});
