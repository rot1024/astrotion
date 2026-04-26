import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";

export type CreateBodyImageOptimizerOptions = {
  /**
   * Result of `import.meta.glob` against valid image extensions in the
   * cache dir, with `{ import: "default" }`. Each entry is a lazy loader
   * that resolves to `ImageMetadata`.
   */
  localImages: Record<string, () => Promise<ImageMetadata>>;
  /**
   * Result of `import.meta.glob` against ALL files in the cache dir, with
   * `{ query: "?url", import: "default" }`. Each entry resolves to the
   * Vite-managed URL for the file (hashed in build, `/@fs/...` in dev).
   * Used to serve files that are not optimizable images (videos, PDFs,
   * etc.) without relying on a symlink under `public/`.
   */
  localUrls: Record<string, () => Promise<string>>;
  /**
   * URL prefix used in the rendered HTML (e.g. `/static/`). Asset
   * references whose value starts with this prefix are candidates for
   * rewriting.
   */
  publicPrefix: string;
  /**
   * Glob key prefix corresponding to `publicPrefix`, with leading and
   * trailing slashes (e.g. `/node_modules/.astro/.astrotion/static/`).
   */
  filePrefix: string;
  /**
   * Width buckets for the generated `srcset`. Values larger than the source
   * image are clamped automatically. Defaults to `[400, 800, 1200, 1600]`.
   */
  widths?: number[];
  /**
   * `sizes` attribute applied to the optimized `<img>`. Defaults to
   * `(min-width: 768px) 768px, 100vw`.
   */
  sizes?: string;
};

const DEFAULT_WIDTHS = [400, 800, 1200, 1600];
const DEFAULT_SIZES = "(min-width: 768px) 768px, 100vw";

// Tags whose `src` attribute we rewrite (no image optimization, just URL).
const URL_TAGS = ["source", "video", "audio", "track"];

export function createBodyImageOptimizer(opts: CreateBodyImageOptimizerOptions) {
  const widths = opts.widths ?? DEFAULT_WIDTHS;
  const sizesAttr = opts.sizes ?? DEFAULT_SIZES;
  const imgCache = new Map<string, Promise<string>>();
  const urlCache = new Map<string, Promise<string>>();

  const resolveUrl = (filename: string): Promise<string> | undefined => {
    const key = `${opts.filePrefix}${filename}`;
    const loader = opts.localUrls[key];
    if (!loader) return undefined;
    let pending = urlCache.get(key);
    if (!pending) {
      pending = (async () => {
        const raw = await loader();
        // `import.meta.glob(..., { query: "?url", import: "default" })`
        // is supposed to resolve to the URL string. Some Vite versions
        // return the module namespace instead, so unwrap defensively.
        if (typeof raw === "string") return raw;
        const wrapped = raw as { default?: unknown };
        if (typeof wrapped?.default === "string") return wrapped.default;
        return String(raw);
      })();
      urlCache.set(key, pending);
    }
    return pending;
  };

  return async function optimizeBodyImages(html: string): Promise<string> {
    if (!html) return html;
    const replacements: Array<[string, string]> = [];

    // 1) <img ...>: try image optimization, fall back to plain URL rewrite.
    for (const m of html.matchAll(
      /<img\s+([^>]*?)\bsrc="([^"]+)"([^>]*)>/gi,
    )) {
      const [full, before, src, after] = m;
      if (!src.startsWith(opts.publicPrefix)) continue;
      const filename = src.slice(opts.publicPrefix.length);

      const loader = opts.localImages[`${opts.filePrefix}${filename}`];
      let meta: ImageMetadata | null = null;
      if (loader) {
        try {
          meta = await loader();
        } catch {
          meta = null;
        }
      }

      if (meta && meta.width > 0) {
        const cacheKey = `${meta.src}|${meta.width}`;
        let pending = imgCache.get(cacheKey);
        if (!pending) {
          pending = buildOptimizedImg(meta, before, after, widths, sizesAttr);
          imgCache.set(cacheKey, pending);
        }
        replacements.push([full, await pending]);
        continue;
      }

      // Image optimization unavailable (e.g. corrupt or non-image disguised
      // as `.webp`). Rewrite the bare URL so the file is served by Vite
      // instead of relying on a symlink.
      const url = await resolveUrl(filename);
      if (!url) continue;
      replacements.push([full, `<img ${before}src="${url}"${after}>`]);
    }

    // 2) Other tags with `src`: just URL rewrite.
    const tagPattern = new RegExp(
      `<(${URL_TAGS.join("|")})\\s+([^>]*?)\\bsrc="([^"]+)"([^>]*)>`,
      "gi",
    );
    for (const m of html.matchAll(tagPattern)) {
      const [full, tag, before, src, after] = m;
      if (!src.startsWith(opts.publicPrefix)) continue;
      const filename = src.slice(opts.publicPrefix.length);
      const url = await resolveUrl(filename);
      if (!url) continue;
      replacements.push([full, `<${tag} ${before}src="${url}"${after}>`]);
    }

    let result = html;
    for (const [from, to] of replacements) {
      result = result.replace(from, to);
    }
    return result;
  };
}

async function buildOptimizedImg(
  meta: ImageMetadata,
  before: string,
  after: string,
  widths: number[],
  sizesAttr: string,
): Promise<string> {
  const clamped = widths.filter((w) => w <= meta.width);
  if (clamped.length === 0 || clamped[clamped.length - 1] !== meta.width) {
    clamped.push(meta.width);
  }

  const optimized = await getImage({
    src: meta,
    widths: clamped,
    format: "webp",
    sizes: sizesAttr,
  });

  const stripped = `${before} ${after}`
    .replace(/\b(src|srcset|width|height|loading|decoding|sizes)="[^"]*"/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const attrs = [
    `src="${optimized.src}"`,
    optimized.srcSet?.attribute
      ? `srcset="${optimized.srcSet.attribute}"`
      : "",
    `width="${optimized.attributes.width ?? meta.width}"`,
    `height="${optimized.attributes.height ?? meta.height}"`,
    optimized.attributes.sizes ? `sizes="${optimized.attributes.sizes}"` : "",
    `loading="lazy"`,
    `decoding="async"`,
    stripped,
  ].filter(Boolean);

  return `<img ${attrs.join(" ")}>`;
}
