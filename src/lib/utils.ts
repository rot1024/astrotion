import path from "node:path";

import { format } from "date-fns";

import config from "../config";
import { BASE_PATH, DEBUG } from "../constants";

import type { Post } from "./interfaces";

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

export function mergeMaps<K, V>(
  ...maps: (Map<K, V> | null | undefined)[]
): Map<K, V> {
  const result = new Map<K, V>();
  maps.forEach((map) => {
    if (!map) return;

    map.forEach((v, k) => {
      result.set(k, v);
    });
  });
  return result;
}

export function debug(...args: any[]) {
  if (!DEBUG) return;
  console.debug("astrotion:", ...args);
}

export function formatPostDate(date: string): string {
  return format(new Date(date), config.dateFormat || "yyyy-MM-dd");
}

export function paginate(posts: Post[], page: string) {
  const pageSize = config.postsPerPage || 20;
  const pageInt = parseInt(page, 10);
  const pageCount = Math.ceil(posts.length / pageSize);
  const pagePosts = posts.slice((pageInt - 1) * pageSize, pageInt * pageSize);

  return {
    pagePosts,
    pageCount,
    pageInt,
    pageSize,
  };
}

export function fileUrlToAssetUrl(
  imageUrl: string | undefined,
  id: string,
): string | undefined {
  if (!imageUrl) return undefined; // should not download

  const url = new URL(imageUrl);
  if (!url.searchParams.has("X-Amz-Expires") && !isUnsplash(url)) {
    return undefined; // should not download
  }

  const filename = url.pathname.split("/").at(-1);
  if (!filename) return imageUrl;

  const ext = path.extname(filename);
  let finalFilename = filename;

  // it may be animated gif, but sharp does not support converting it to animated webp
  if (ext !== ".gif") {
    // replace ext to webp
    const filenameWithoutExt =
      id || (ext ? filename.slice(0, -ext.length) : undefined);
    finalFilename = filenameWithoutExt
      ? filenameWithoutExt + ".webp"
      : filename;
  }

  const newUrl = path.join(assetsDir, finalFilename);
  return newUrl;
}

function isUnsplash(url: URL): boolean {
  return url.hostname === "images.unsplash.com";
}

export const assetsDir = "/static";
