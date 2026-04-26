import path from "node:path";
import { pathToFileURL } from "node:url";

// Loose plugin type so the package is not coupled to a specific Vite major.
// Astro bundles its own Vite which can diverge from any direct dep.
type ViteLikePlugin = {
  name: string;
  enforce?: "pre" | "post";
  resolveId?(
    this: unknown,
    id: string,
    importer?: string,
    options?: { ssr?: boolean; isEntry?: boolean },
  ): string | null | undefined;
  load?(this: unknown, id: string): string | null | undefined;
};

// Use an extensionless `\0`-prefixed virtual id so Astro's image plugin,
// which matches by file extension, leaves it alone. The original absolute
// path is preserved in a separate Map so the load hook can recover it.
const VIRTUAL_PREFIX = "\0astrotion-stub:";

let stubCounter = 0;

/**
 * Returns a Vite plugin that protects Astro's image asset loader from files
 * which look like images by extension but are not (e.g. an MP4 saved as
 * `.webp`). The plugin uses `resolveId` to redirect those files to a
 * virtual module that exports a synthetic `ImageMetadata`, so the real
 * file is never opened by the image plugin.
 *
 * Files imported with `?url` or `?raw` are left alone, so the runtime body
 * optimizer can still serve them as static assets via Vite.
 */
export function nonImageStubPlugin(absPaths: Set<string>): ViteLikePlugin {
  const idForPath = new Map<string, string>();
  const pathForId = new Map<string, string>();
  return {
    name: "astrotion:non-image-stub",
    enforce: "pre",
    resolveId(id, importer) {
      const [cleanId, query] = id.split("?");
      if (!cleanId) return null;

      // ?url / ?raw imports should hit Vite's default static asset handling,
      // not our stub. They are how the runtime serves videos, PDFs, etc.
      if (query) {
        const params = new URLSearchParams(query);
        if (params.has("url") || params.has("raw")) return null;
      }

      // The id may arrive in several forms depending on context:
      //   1. relative to the importer (e.g. `../../node_modules/.../foo.webp`)
      //   2. project-root-absolute (`/node_modules/.../foo.webp`)
      //   3. real filesystem absolute (`/Users/.../node_modules/.../foo.webp`)
      // Try them in that order and keep the first that matches the set of
      // non-image files we collected from the cache directory.
      const candidates: string[] = [];
      if (importer && !path.isAbsolute(cleanId) && cleanId.includes("/")) {
        candidates.push(path.resolve(path.dirname(importer), cleanId));
      }
      if (cleanId.startsWith("/")) {
        candidates.push(path.resolve(cleanId));
        candidates.push(path.resolve("." + cleanId));
      }
      const absPath = candidates.find((p) => absPaths.has(p));
      if (!absPath) return null;

      let virtualId = idForPath.get(absPath);
      if (!virtualId) {
        virtualId = `${VIRTUAL_PREFIX}${stubCounter++}`;
        idForPath.set(absPath, virtualId);
        pathForId.set(virtualId, absPath);
      }
      return virtualId;
    },
    load(id) {
      if (!id.startsWith(VIRTUAL_PREFIX)) return null;
      const absPath = pathForId.get(id);
      if (!absPath) return null;
      const fileUrl = pathToFileURL(absPath).href;
      return [
        `// stubbed by @astrotion/astro for non-image asset`,
        `export default {`,
        `  src: ${JSON.stringify(fileUrl)},`,
        `  width: 0,`,
        `  height: 0,`,
        `  format: "webp",`,
        `};`,
      ].join("\n");
    },
  };
}
