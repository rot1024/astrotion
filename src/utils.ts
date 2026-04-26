import path from "node:path";

import { createBodyImageOptimizer } from "@astrotion/astro/runtime";
import type { ImageMetadata } from "astro";
import { format } from "date-fns";

import config from "./config";
import { ASSET_DIR, BASE_PATH, CACHE_DIR_ASSETS } from "./constants";

export function postUrl(slug: string, base?: string | URL): string {
  if (!path.extname(slug)) {
    slug += "/";
  }
  return getUrl(`/posts/${slug}`, base);
}

export function assetUrl(url: string, base?: string | URL): string {
  const filename = path.basename(url);
  return getUrl(`/static/${filename}`, base);
}

export function getUrl(p: string, base?: string | URL): string {
  if (base) {
    return new URL(getUrl(p), base).toString();
  }

  if ((!p || p === "/") && BASE_PATH) {
    return path.join(BASE_PATH, "") + "/";
  }

  // extension is not included, add slash
  if (!path.extname(p)) {
    p += "/";
  }

  return path.join(BASE_PATH, p);
}

export function formatPostDate(date: string): string {
  return format(new Date(date), config.dateFormat || "yyyy-MM-dd");
}

// Vite globs must be authored in user source so the patterns are
// statically analyzable; the optimizer algorithm itself lives in
// `@astrotion/astro/runtime`.
const localImages = import.meta.glob<ImageMetadata>(
  "/node_modules/.astro/.astrotion/static/*.{webp,png,jpg,jpeg,gif,avif}",
  { import: "default" },
);
const localUrls = import.meta.glob<string>(
  "/node_modules/.astro/.astrotion/static/*",
  { query: "?url", import: "default" },
);

export const optimizeBodyImages = createBodyImageOptimizer({
  localImages,
  localUrls,
  publicPrefix: `/${ASSET_DIR}/`,
  filePrefix: `/${CACHE_DIR_ASSETS}/`,
});

