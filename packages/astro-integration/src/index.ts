// Top-level entry: integration only. Safe to import from `astro.config.mjs`,
// where `astro:content` is not available.
export { astrotion, type AstrotionIntegrationOptions } from "./integration.ts";
export {
  DEFAULT_CACHE_DIR,
  DEFAULT_PUBLIC_DIR_NAME,
  DEFAULT_NOTION_CACHE_DIR,
  DEFAULT_POSTS_DIR,
} from "./lib/paths.ts";
