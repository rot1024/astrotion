import path from "node:path";

import { APIResponseError } from "@notionhq/client";
import type {
  BlockObjectResponse,
  DatabaseObjectResponse,
  PageObjectResponse,
  PartialBlockObjectResponse,
  PartialDatabaseObjectResponse,
  PartialPageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import retry from "async-retry";

type Value<T> = T extends { [K in string | number | symbol]: infer V }
  ? V
  : never;

export type Properties = Value<PageObjectResponse["properties"]>;

export const numberOfRetry = 2;

export async function getSingle<T>(cb: () => Promise<T>): Promise<T> {
  const res = await retry(
    async (bail) => {
      try {
        return await cb();
      } catch (error: unknown) {
        if (error instanceof APIResponseError) {
          if (error.status && error.status >= 400 && error.status < 500) {
            bail(error);
          }
        }
        throw error;
      }
    },
    {
      retries: numberOfRetry,
    },
  );

  return res;
}

type Response<T> = {
  next_cursor: string | null;
  has_more: boolean;
  results: T[];
};

export async function getAll<T>(
  cb: (cursor: string | undefined) => Promise<Response<T>>,
): Promise<T[]> {
  let results: T[] = [];
  let cursor: string | undefined = undefined;

  while (true) {
    const res = await getSingle(() => cb(cursor));

    results = results.concat(res.results);

    if (!res.has_more) {
      break;
    }

    cursor = res.next_cursor ?? undefined;
  }

  return results;
}

export function getLastEditedTime(
  obj:
    | PageObjectResponse
    | PartialPageObjectResponse
    | PartialDatabaseObjectResponse
    | DatabaseObjectResponse
    | PartialBlockObjectResponse
    | BlockObjectResponse,
): Date | undefined {
  if ("last_edited_time" in obj) {
    return new Date(obj.last_edited_time);
  }
  return;
}

export function expiresInForObjects(
  objects: (
    | PageObjectResponse
    | BlockObjectResponse
    | PartialPageObjectResponse
    | PartialBlockObjectResponse
    | undefined
  )[],
): Date | undefined {
  let exp: Date | undefined;
  for (const object of objects) {
    if (!object) continue;

    const object_expiry_time = expiresIn(object);
    if (!object_expiry_time) continue;

    if (!exp || object_expiry_time < exp) {
      exp = object_expiry_time;
    }
  }

  return exp;
}

export function expiresIn(
  pageOrBlock:
    | PageObjectResponse
    | BlockObjectResponse
    | PartialPageObjectResponse
    | PartialBlockObjectResponse,
): Date | undefined {
  const exp: string[] = [];

  if ("icon" in pageOrBlock && pageOrBlock.icon?.type === "file") {
    exp.push(pageOrBlock.icon.file.expiry_time);
  }

  if ("cover" in pageOrBlock && pageOrBlock.cover?.type === "file") {
    exp.push(pageOrBlock.cover.file.expiry_time);
  }

  if ("properties" in pageOrBlock && pageOrBlock.properties) {
    for (const [, prop] of Object.entries(pageOrBlock.properties)) {
      if (prop.type === "files") {
        for (const file of prop.files) {
          if (file.type === "file") {
            exp.push(file.file.expiry_time);
          }
        }
      }
    }
  }

  if (
    "type" in pageOrBlock &&
    pageOrBlock.type === "image" &&
    pageOrBlock.image.type === "file"
  ) {
    exp.push(pageOrBlock.image.file.expiry_time);
  }

  if (
    "type" in pageOrBlock &&
    pageOrBlock.type === "video" &&
    pageOrBlock.video.type === "file"
  ) {
    exp.push(pageOrBlock.video.file.expiry_time);
  }

  if (
    "type" in pageOrBlock &&
    pageOrBlock.type === "audio" &&
    pageOrBlock.audio.type === "file"
  ) {
    exp.push(pageOrBlock.audio.file.expiry_time);
  }

  if (
    "type" in pageOrBlock &&
    pageOrBlock.type === "file" &&
    pageOrBlock.file.type === "file"
  ) {
    exp.push(pageOrBlock.file.file.expiry_time);
  }

  if (
    "type" in pageOrBlock &&
    pageOrBlock.type === "pdf" &&
    pageOrBlock.pdf.type === "file"
  ) {
    exp.push(pageOrBlock.pdf.file.expiry_time);
  }

  if (
    "type" in pageOrBlock &&
    pageOrBlock.type === "callout" &&
    pageOrBlock.callout.icon?.type === "file"
  ) {
    exp.push(pageOrBlock.callout.icon.file.expiry_time);
  }

  if (exp.length === 0) return;

  const expiry_time = exp.sort()[0];
  return new Date(expiry_time);
}

export function fileUrlToAssetUrl(
  imageUrl: string | undefined,
): string | undefined {
  if (!imageUrl) return undefined; // should not download

  const url = new URL(imageUrl);
  if (!url.searchParams.has("X-Amz-Expires")) return undefined; // should not download

  const filename = url.pathname.split("/").at(-1);
  if (!filename) return imageUrl;

  // replace ext to webp
  const ext = path.extname(filename);
  const finalFilename = ext ? filename.replace(ext, ".webp") : filename;

  const newUrl = path.join(assetsDir, finalFilename);
  return newUrl;
}

export const assetsDir = "/static";
