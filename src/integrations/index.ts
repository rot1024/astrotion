import child_process from "node:child_process";
import fs from "node:fs";

import type { AstroIntegration } from "astro";

const assetsDir = "public/static";

export default (): AstroIntegration => ({
  name: "astrotion",
  hooks: {
    "astro:build:done": async ({ dir }) => {
      const outDir = new URL("notion", dir.href).pathname;
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir);
      }

      child_process.execSync(`cp -n -r ${assetsDir}/* ${outDir} || true`);
    },
  },
});
