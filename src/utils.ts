import path from "node:path";

import { format } from "date-fns";

import config from "./config";
import { BASE_PATH } from "./constants";

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
