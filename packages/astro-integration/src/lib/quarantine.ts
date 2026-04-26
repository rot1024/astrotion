import fs from "node:fs";
import path from "node:path";

const IMAGE_EXTS = new Set([".webp", ".png", ".jpg", ".jpeg", ".gif", ".avif"]);

/**
 * Notiondown sometimes saves video files (e.g. MP4 / MOV) with image
 * extensions because Notion serves them from the same `/images/` URL space.
 * Astro's Vite asset plugin will refuse to load them as images, breaking the
 * `import.meta.glob` used by `optimizeBodyImages` AND the wider build.
 *
 * Rather than renaming or moving the files (which breaks the URLs that
 * notiondown emitted in `<video>` tags), we leave them in place and ask the
 * caller to install a Vite plugin that stubs them out for the asset loader.
 *
 * Returns the absolute filesystem paths of files that look like an image by
 * extension but do not have valid image magic bytes.
 */
export async function findNonImageAssets(dir: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await fs.promises.readdir(dir);
  } catch {
    return [];
  }

  const results: string[] = [];
  for (const name of entries) {
    const ext = path.extname(name).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;

    const full = path.resolve(dir, name);
    let buf: Buffer;
    try {
      const fh = await fs.promises.open(full, "r");
      buf = Buffer.alloc(16);
      await fh.read(buf, 0, 16, 0);
      await fh.close();
    } catch {
      continue;
    }

    if (looksLikeImage(buf)) continue;
    results.push(full);
  }
  return results;
}

function looksLikeImage(b: Buffer): boolean {
  if (b.length < 12) return false;
  // PNG: 89 50 4E 47
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return true;
  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true;
  // GIF: "GIF8"
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return true;
  // RIFF....WEBP
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return true;
  // ISO base media: only allow image brands.
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = b.slice(8, 12).toString("ascii");
    if (brand === "avif" || brand === "avis" || brand === "heic" || brand === "mif1")
      return true;
  }
  return false;
}
