import fs from "node:fs";
import path from "node:path";

import { PromisePool } from "@supercharge/promise-pool";
import sharp from "sharp";

import { CACHE_DIR_ASSETS } from "../constants";

import { debug, mergeMaps } from "./utils";

const downloadConrurrency = 3;

export async function downloadImages(
  ...images: (Map<string, string> | undefined)[]
): Promise<void> {
  if (!images) return;

  await fs.promises.mkdir(CACHE_DIR_ASSETS, { recursive: true });

  const { errors } = await PromisePool.withConcurrency(downloadConrurrency)
    .for(mergeMaps(...images))
    .process(async ([imageUrl, localUrl]) => {
      const localDest = path.join("public", localUrl);

      if (await fs.promises.stat(localDest).catch(() => null)) {
        debug(`download skipped: ${imageUrl} -> ${localDest}`);
        return;
      }

      debug(`download: ${imageUrl} -> ${localDest}`);

      const res = await fetch(imageUrl);
      if (res.status !== 200) {
        throw new Error(
          `Failed to download ${imageUrl} due to statu code ${res.status}`,
        );
      }

      const body = await res.arrayBuffer();

      // optimize images
      const optimzied = await sharp(body).rotate().webp().toBuffer();
      debug(
        "image optimized",
        localDest,
        `${body.byteLength} bytes -> ${optimzied.length} bytes`,
        `(${Math.floor((optimzied.length / body.byteLength) * 100)}%)`,
      );

      await fs.promises.writeFile(localDest, optimzied);
    });

  if (errors.length > 0) {
    throw new Error(
      `Failed to download images: ${errors.map((e) => e.message).join(", ")}`,
    );
  }
}
