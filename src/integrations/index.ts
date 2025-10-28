import child_process from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import type { AstroIntegration } from "astro";
import symlinkDir from "symlink-dir";

import { ASSET_DIR, CACHE_DIR_ASSETS } from "../constants";

export default (): AstroIntegration => ({
  name: "astrotion",
  hooks: {
    "astro:config:setup": async ({ command }) => {
      fs.mkdirSync(CACHE_DIR_ASSETS, { recursive: true });

      // In dev mode, create symlink to public directory for serving assets
      if (command === "dev") {
        await createPublicSymlink();
      }
    },
    "astro:build:start": async () => {
      // Runs before build starts
      // Create cache directory and symlink so Vite can find assets during build
      fs.mkdirSync(CACHE_DIR_ASSETS, { recursive: true });
      await createPublicSymlink();
    },
    "astro:build:done": async ({ dir }) => {
      // Runs after build completes
      // Copy assets from cache to final dist directory
      const outDir = new URL(ASSET_DIR, dir.href).pathname;
      fs.mkdirSync(outDir, { recursive: true });

      const command = `cp -n -r ${CACHE_DIR_ASSETS}/* ${outDir} || true`;
      console.log(`astrotion: copying assets: ${command}`);
      child_process.execSync(command);
    },
  },
});

/**
 * Creates a symlink from public/static to the cache directory.
 * Uses symlink-dir for cross-platform compatibility (Windows support).
 * This allows Astro to serve cached assets during dev and build.
 */
async function createPublicSymlink() {
  const publicAssetDir = path.join("public", ASSET_DIR);

  // Remove existing symlink or directory
  try {
    const stats = fs.lstatSync(publicAssetDir);
    // If it's a symlink, use unlinkSync; otherwise use rmSync
    if (stats.isSymbolicLink()) {
      fs.unlinkSync(publicAssetDir);
      console.log(`astrotion: removed existing symlink ${publicAssetDir}`);
    } else {
      fs.rmSync(publicAssetDir, { recursive: true, force: true });
      console.log(`astrotion: removed existing directory ${publicAssetDir}`);
    }
  } catch (error: any) {
    // ENOENT means the file doesn't exist, which is fine
    if (error.code !== "ENOENT") {
      console.error(`astrotion: error checking ${publicAssetDir}:`, error);
    }
  }

  // Create symlink using symlink-dir for cross-platform support
  try {
    await symlinkDir(CACHE_DIR_ASSETS, publicAssetDir);
    console.log(`astrotion: created symlink ${publicAssetDir} -> ${CACHE_DIR_ASSETS}`);
  } catch (error) {
    console.error(`astrotion: failed to create symlink:`, error);
    throw error;
  }
}
