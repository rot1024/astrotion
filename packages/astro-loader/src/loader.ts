import { basename, posix, relative } from "node:path";

import { Client, type Options as ClientOptions, type Post } from "notiondown";

import { downloadNotionImages } from "./image.ts";

type RenderedContent = {
  html: string;
  metadata?: Record<string, unknown>;
};

/**
 * Minimal subset of Astro's Loader API used by this loader.
 * Defined locally so `notiondown` does not need a hard dependency on `astro`.
 */
type AstroLogger = {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
  debug?: (msg: string) => void;
};

type StoreEntry = {
  id: string;
  data: Record<string, unknown>;
  body?: string;
  filePath?: string;
  rendered?: RenderedContent;
  digest?: string | number;
};

type AstroDataStore = {
  clear: () => void;
  set: (entry: StoreEntry) => boolean;
  get?: (id: string) => StoreEntry | undefined;
  delete?: (id: string) => void;
  keys?: () => Iterable<string>;
  has?: (id: string) => boolean;
  addAssetImport?: (assetImport: string, filePath?: string) => void;
  addAssetImports?: (assets: string[], filePath?: string) => void;
};

type LoaderContext = {
  store: AstroDataStore;
  logger: AstroLogger;
  generateDigest?: (data: string | Record<string, unknown>) => string;
  renderMarkdown?: (md: string) => Promise<RenderedContent>;
  parseData?: <T extends Record<string, unknown>>(input: {
    id: string;
    data: T;
    filePath?: string;
  }) => Promise<T>;
};

export type AstroLoader = {
  name: string;
  load: (context: LoaderContext) => Promise<void>;
};

export type NotiondownLoaderOptions = Omit<
  ClientOptions,
  "cacheDir" | "assetUrlTransform"
> & {
  /**
   * Cache directory for Notion API responses.
   * Defaults to `./node_modules/.cache/notiondown` so it lands inside the
   * `node_modules/` tree that platforms like Cloudflare Pages, Vercel and
   * Netlify cache between builds automatically.
   */
  cacheDir?: string;
  /**
   * Local directory to save Notion images into.
   * Defaults to `./public/notion` so the files are served by Astro at
   * `/notion/<filename>` without further configuration.
   *
   * Set to `null` to disable image downloading.
   */
  imageDir?: string | null;
  /**
   * Directory where synthetic per-entry source files conceptually live.
   * Used as `filePath` on each entry so Astro's `image()` schema helper and
   * markdown image pipeline can resolve relative paths. The files are not
   * actually written; only the path is used for resolution.
   *
   * Defaults to a sibling of `imageDir` named `posts/`, so the relative path
   * from a post file to the image dir is `../<basename(imageDir)>/<file>`.
   */
  postsDir?: string;
  /**
   * URL prefix used to reference downloaded images from the rendered
   * markdown body (e.g. `<img src="/static/foo.webp">`). Body images cannot
   * be routed through Astro's image pipeline because `renderMarkdown` does
   * not accept a `filePath` context; instead, they are served as static
   * public files. Defaults to `/` + basename(imageDir).
   *
   * Cover and featuredImage are unaffected — they go through `mapEntry` as
   * relative paths from the entry's `filePath` so the `image()` schema
   * helper can transform them into optimized assets.
   */
  publicPath?: string;
  /**
   * Concurrency for image downloads. Defaults to 3.
   */
  imageConcurrency?: number;
  /**
   * Custom URL transform for asset references inside markdown.
   * Overrides the default `(filename) => publicPath + "/" + filename`.
   */
  assetUrlTransform?: (filename: string) => string;
  /**
   * Custom mapper from a Notiondown `Post` (plus rendered markdown and
   * resolved local image paths) to the entry data stored in the collection.
   */
  mapEntry?: (input: {
    post: Post;
    markdown: string;
    /**
     * Map keyed by the assetsDir-relative path used by notiondown
     * (e.g. `post.cover`). Values are the relative paths used inside the
     * entry (e.g. `../static/foo.webp`), suitable for Astro's `image()`
     * schema helper when paired with the entry's `filePath`.
     */
    localImages: Map<string, string>;
  }) => Record<string, unknown>;
};

const DEFAULT_CACHE_DIR = "./node_modules/.cache/notiondown";
const DEFAULT_IMAGE_DIR = "./node_modules/.cache/notiondown/assets";

/**
 * Astro Content Layer loader for Notion databases.
 *
 * Images are downloaded to `./public/notion/` by default and referenced via
 * `/notion/<filename>` URLs in both the rendered HTML body and `cover` /
 * `featuredImage` fields. WebP optimization is performed by notiondown
 * itself when `sharp` is installed.
 *
 * @example
 * ```ts
 * // src/content.config.ts
 * import { defineCollection, z } from 'astro:content';
 * import { notiondownLoader } from 'notiondown/astro';
 *
 * export const collections = {
 *   posts: defineCollection({
 *     loader: notiondownLoader({
 *       dataSourceId: process.env.NOTION_DATABASE_ID!,
 *       auth: process.env.NOTION_TOKEN!,
 *     }),
 *     schema: z.object({
 *       title: z.string(),
 *       cover: z.string().optional(),
 *     }),
 *   }),
 * };
 * ```
 */
export function notiondownLoader(options: NotiondownLoaderOptions): AstroLoader {
  const {
    cacheDir = DEFAULT_CACHE_DIR,
    imageDir = DEFAULT_IMAGE_DIR,
    postsDir,
    publicPath,
    imageConcurrency = 3,
    assetUrlTransform,
    mapEntry = defaultMapEntry,
    ...rest
  } = options;

  // Synthetic per-entry source directory. Sibling of imageDir by default so
  // the relative path to assets is short and stable.
  const resolvedPostsDir = postsDir ?? toSiblingPostsDir(imageDir);

  // Public URL prefix for body images (e.g. "/static"). Defaults to a leading
  // slash plus the basename of imageDir, matching common static-serving
  // conventions where `<imageDir>` is symlinked under `public/`.
  const resolvedPublicPath = (
    publicPath ?? (imageDir ? "/" + basename(imageDir) : "/")
  ).replace(/\/+$/, "");

  // Relative path from a post file's directory to the image directory. Used
  // for cover/featuredImage so Astro's `image()` schema helper can resolve
  // them against the entry's `filePath` and run them through the image
  // pipeline.
  const assetRelPrefix = imageDir
    ? toPosix(relative(resolvedPostsDir, imageDir))
    : "";

  // Body markdown image transform. Routes through the public URL because
  // `renderMarkdown` has no filePath context for relative-path resolution.
  const urlTransform =
    assetUrlTransform ??
    ((filename: string) => `${resolvedPublicPath}/${filename}`);

  const clientOptions: ClientOptions = {
    ...rest,
    cacheDir,
    assetUrlTransform: urlTransform,
  };

  // Map a notiondown asset filename to a relative path for the image()
  // schema helper, suitable for use in `data.cover` etc.
  const toCoverPath = (filename: string) => posix.join(assetRelPrefix, filename);

  const filePathFor = (id: string) =>
    toPosix(posix.join(resolvedPostsDir, `${id}.md`));

  return {
    name: "notiondown",
    load: async ({ store, logger, generateDigest, renderMarkdown, parseData }) => {
      if (!renderMarkdown || !parseData) {
        throw new Error(
          "@astrotion/loader requires Astro's renderMarkdown and parseData " +
            "context (Astro >= 5.0). Update Astro or pass a custom render pipeline.",
        );
      }

      const client = new Client(clientOptions);
      await client.loadCache();

      logger.info("fetching posts from Notion");
      const { posts } = await client.getDatabaseAndAllPosts();

      const computeDigest = (post: Post): string | number | undefined => {
        if (!generateDigest) return undefined;
        return generateDigest({
          id: post.id,
          updatedAt: post.updatedAt,
          slug: post.slug,
        });
      };

      const seenIds = new Set<string>();
      const toRender: Post[] = [];

      // Pass 1: figure out which posts need re-rendering.
      for (const post of posts) {
        const id = post.slug || post.id;
        seenIds.add(id);

        const digest = computeDigest(post);
        const existing = store.get?.(id);
        if (digest && existing?.digest === digest) continue;
        toRender.push(post);
      }

      // Pass 2: fetch markdown for changed posts and collect all assets.
      const contents = new Map<string, { markdown: string }>();
      const allAssets = new Map<string, string>();

      // Always collect post-level images (cover/featuredImage) for download
      // even on unchanged posts, since the image dir is not always cached.
      for (const post of posts) {
        if (post.images) {
          for (const [url, local] of Object.entries(post.images)) {
            allAssets.set(url, local);
          }
        }
      }

      for (const post of toRender) {
        const content = await client.getPostContent(post.id, posts);
        contents.set(post.id, { markdown: content.markdown });
        if (content.assets) {
          for (const [url, local] of content.assets) {
            allAssets.set(url, local);
          }
        }
      }

      const localImages = new Map<string, string>();
      if (imageDir) {
        logger.info(
          `downloading ${allAssets.size} image(s) -> ${imageDir}`,
        );
        await downloadNotionImages(allAssets, {
          dir: imageDir,
          concurrency: imageConcurrency,
          logger,
        });
        // Map assetsDir-relative path (e.g. "assets/foo_cover.webp") to the
        // relative path used inside entries (e.g. "../static/foo_cover.webp"),
        // so the default mapEntry can rewrite `post.cover` etc. Astro resolves
        // these against each entry's `filePath` and runs them through the
        // image pipeline.
        for (const assetsDirPath of allAssets.values()) {
          localImages.set(assetsDirPath, toCoverPath(basename(assetsDirPath)));
        }
      }

      const writeEntry = async (post: Post, digest: string | number | undefined) => {
        const id = post.slug || post.id;
        const filePath = filePathFor(id);
        const content = contents.get(post.id) ?? { markdown: "" };
        const rawData = mapEntry({
          post,
          markdown: content.markdown,
          localImages,
        });
        // parseData runs the schema (including image() helper transforms) so
        // image() fields become `__ASTRO_IMAGE_<src>` sentinels. filePath
        // provides the resolution base for relative paths.
        const data = await parseData({ id, data: rawData, filePath });
        // Astro's parseData transforms image() values but does NOT register
        // the asset imports (unlike file-based loaders). Without registration
        // the sentinels are not resolved during the build, so we walk the
        // data and register every `__ASTRO_IMAGE_…` reference we find.
        registerImageAssets(data, filePath, store);
        const rendered = content.markdown
          ? await renderMarkdown(content.markdown)
          : undefined;

        store.set({
          id,
          data,
          body: content.markdown,
          filePath,
          rendered,
          digest,
        });
      };

      // Pass 3: write entries (skip unchanged ones).
      let updated = 0;
      for (const post of posts) {
        const id = post.slug || post.id;
        const digest = computeDigest(post);
        const existing = store.get?.(id);
        if (digest && existing?.digest === digest) continue;

        await writeEntry(post, digest);
        updated++;
      }

      // Pass 4: delete entries that no longer exist upstream.
      let removed = 0;
      if (store.keys && store.delete) {
        for (const id of Array.from(store.keys())) {
          if (!seenIds.has(id)) {
            store.delete(id);
            removed++;
          }
        }
      } else if (toRender.length === posts.length) {
        // Loader API without keys/delete: fall back to clear+rewrite.
        store.clear();
        for (const post of posts) {
          await writeEntry(post, computeDigest(post));
        }
      }

      logger.info(
        `loaded ${posts.length} post(s) (updated=${updated}, removed=${removed}, skipped=${posts.length - toRender.length})`,
      );
    },
  };
}

const IMAGE_IMPORT_PREFIX = "__ASTRO_IMAGE_";

function registerImageAssets(
  data: Record<string, unknown>,
  filePath: string,
  store: AstroDataStore,
): void {
  if (!store.addAssetImport) return;
  const visit = (value: unknown) => {
    if (typeof value === "string") {
      if (value.startsWith(IMAGE_IMPORT_PREFIX)) {
        const src = value.slice(IMAGE_IMPORT_PREFIX.length);
        store.addAssetImport!(src, filePath);
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const v of value) visit(v);
      return;
    }
    if (value && typeof value === "object") {
      for (const v of Object.values(value)) visit(v);
    }
  };
  visit(data);
}

function toPosix(p: string): string {
  return p.split(/[\\/]/g).filter(Boolean).join("/");
}

function toSiblingPostsDir(imageDir: string | null | undefined): string {
  if (!imageDir) return "node_modules/.cache/notiondown/posts";
  // Place "posts/" as a sibling of imageDir's basename. e.g.
  // imageDir = "node_modules/.astro/.astrotion/static"
  // → posts dir = "node_modules/.astro/.astrotion/posts"
  const segs = toPosix(imageDir).split("/");
  segs[segs.length - 1] = "posts";
  return segs.join("/");
}

function defaultMapEntry({
  post,
  localImages,
}: {
  post: Post;
  markdown: string;
  localImages: Map<string, string>;
}): Record<string, unknown> {
  const cover = post.cover ? localImages.get(post.cover) ?? post.cover : undefined;
  const featuredImage = post.featuredImage
    ? localImages.get(post.featuredImage) ?? post.featuredImage
    : undefined;

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    date: post.date,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    excerpt: post.excerpt,
    tags: post.tags,
    rank: post.rank,
    lang: post.lang,
    icon: post.icon,
    cover,
    featuredImage,
    additionalProperties: post.additionalProperties,
    parentId: post.parentId,
    pathSegments: post.pathSegments,
    childIds: post.childIds,
  };
}
