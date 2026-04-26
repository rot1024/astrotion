import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    content: "src/collection.ts",
    runtime: "src/runtime/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  external: [
    "astro",
    "astro:assets",
    "astro:content",
    "vite",
    "notiondown",
    "@astrotion/loader",
    "remark-math",
    "rehype-katex",
  ],
});
