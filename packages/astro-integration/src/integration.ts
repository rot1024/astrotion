import fs from "node:fs";

import type { AstroIntegration } from "astro";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

import { DEFAULT_CACHE_DIR } from "./lib/paths.ts";
import { findNonImageAssets } from "./lib/quarantine.ts";
import { nonImageStubPlugin } from "./lib/vitePlugin.ts";

export type AstrotionIntegrationOptions = {
  /**
   * Filesystem directory where Notion assets are downloaded.
   * Defaults to `node_modules/.astro/.astrotion/static`.
   */
  cacheDir?: string;
  /**
   * Whether to inject `remark-math` and `rehype-katex` into Astro's markdown
   * pipeline. Defaults to `true`. The consumer is responsible for importing
   * the `katex/dist/katex.min.css` stylesheet in their layout.
   */
  katex?: boolean;
};

export function astrotion(
  options: AstrotionIntegrationOptions = {},
): AstroIntegration {
  const { cacheDir = DEFAULT_CACHE_DIR, katex = true } = options;

  return {
    name: "astrotion",
    hooks: {
      "astro:config:setup": async ({ updateConfig }) => {
        fs.mkdirSync(cacheDir, { recursive: true });

        const nonImages = new Set(await findNonImageAssets(cacheDir));

        const updates: Parameters<typeof updateConfig>[0] = {
          vite: { plugins: [nonImageStubPlugin(nonImages)] },
        };
        if (katex) {
          updates.markdown = {
            remarkPlugins: [remarkMath],
            rehypePlugins: [rehypeKatex],
          };
        }
        updateConfig(updates);
      },
    },
  };
}
