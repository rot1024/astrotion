/**
 * Default cache directory for downloaded Notion assets. Lives inside
 * `node_modules/.astro/` so that build platforms which cache `node_modules/`
 * (Cloudflare, Vercel, Netlify) keep the assets between builds.
 */
export const DEFAULT_CACHE_DIR = "node_modules/.astro/.astrotion/static";

/**
 * Default URL-visible directory name for assets. The integration creates a
 * symlink at `public/<publicDirName>` pointing to the cache dir, so the
 * files are served at `/<publicDirName>/<file>`.
 */
export const DEFAULT_PUBLIC_DIR_NAME = "static";

/**
 * Default synthetic posts dir used as the per-entry `filePath` base. Sibling
 * of the cache dir so the relative path from a post file to an asset is
 * `../static/<file>`.
 */
export const DEFAULT_POSTS_DIR = "node_modules/.astro/.astrotion/posts";

/**
 * Default Notiondown response cache directory.
 */
export const DEFAULT_NOTION_CACHE_DIR = "node_modules/.astro/.astrotion/notion-cache";
