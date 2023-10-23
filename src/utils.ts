import path from "node:path";

import { BASE_PATH } from "./constants";

export function postUrl(slug: string, base?: string | URL): string {
  return getUrl(`/posts/${slug}`, base);
}

export function assetUrl(url: string, base?: string | URL): string {
  const filename = path.basename(url);
  return getUrl(`/assets/${filename}`, base);
}

export function getUrl(p: string, base?: string | URL): string {
  if (base) {
    return new URL(getUrl(p), base).toString();
  }

  if ((!p || p === "/") && BASE_PATH) {
    return path.join(BASE_PATH, "") + "/";
  }
  return path.join(BASE_PATH, p);
}
