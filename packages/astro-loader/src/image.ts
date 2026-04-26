import { downloadAssets } from "notiondown";

export type ImageDownloadOptions = {
  /** Local directory to save Notion images. */
  dir: string;
  /** Concurrency for parallel downloads. Defaults to 3. */
  concurrency?: number;
  /** Skip download if file already exists. Defaults to true. */
  skipExisting?: boolean;
  /** Logger for debug output. */
  logger?: { info: (msg: string) => void; warn: (msg: string) => void };
};

/**
 * Downloads Notion images to a local directory using notiondown's existing
 * download pipeline (which performs WebP optimization via Sharp when
 * `sharp` is installed, and falls back to saving the original bytes
 * otherwise).
 */
export async function downloadNotionImages(
  assets: Map<string, string>,
  options: ImageDownloadOptions,
): Promise<void> {
  const { dir, concurrency = 3, skipExisting = true } = options;
  if (assets.size === 0) return;

  await downloadAssets(assets, {
    dir,
    concurrency,
    overwrite: !skipExisting,
    optimizeImages: true,
  });
}
