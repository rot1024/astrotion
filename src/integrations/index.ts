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

      // Create symlink to public directory for serving assets in dev mode
      if (command === "dev") {
        await createPublicSymlink();
      }
    },
    "astro:build:start": async () => {
      // In build mode, create symlink before build starts
      // This allows Astro to access assets during the build process
      await createPublicSymlink();
    },
    "astro:build:done": async () => {
      // After build is complete, copy assets to dist directory
      await copyAssetsToDist();
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

  // Ensure public directory exists
  fs.mkdirSync("public", { recursive: true });

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
  // Use relative path from public directory to the cache directory
  const relativePath = path.relative(path.dirname(publicAssetDir), CACHE_DIR_ASSETS);
  try {
    await symlinkDir(relativePath, publicAssetDir);
    console.log(`astrotion: created symlink ${publicAssetDir} -> ${relativePath}`);
  } catch (error) {
    console.error(`astrotion: failed to create symlink:`, error);
    throw error;
  }
}

/**
 * Copies assets from cache to dist directory after build is complete.
 * This ensures all Notion assets are available in the final build output.
 */
async function copyAssetsToDist() {
  const distAssetDir = path.join("dist", ASSET_DIR);

  // Remove existing directory
  if (fs.existsSync(distAssetDir)) {
    fs.rmSync(distAssetDir, { recursive: true });
    console.log(`astrotion: removed existing ${distAssetDir}`);
  }

  // Create directory and copy files
  fs.mkdirSync(distAssetDir, { recursive: true });

  try {
    const command = `cp -r ${CACHE_DIR_ASSETS}/* ${distAssetDir}/ 2>/dev/null || true`;
    child_process.execSync(command);
    console.log(`astrotion: copied assets to ${distAssetDir}`);
  } catch (error) {
    console.error(`astrotion: failed to copy assets:`, error);
  }
}
