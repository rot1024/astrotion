import remarkEmbedder from "@remark-embedder/core";
import rehypeKatex from "rehype-katex";
import rehypeMermaid from "rehype-mermaid";
import rehypePrism from "rehype-prism-plus";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { transformers } from "./embed";

export const md2html = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  // remarkEmbedder reports type error
  .use(remarkEmbedder as any, {
    transformers,
  })
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeKatex)
  .use(rehypeMermaid, { strategy: "pre-mermaid" })
  .use(rehypePrism) // put after mermaid
  .use(rehypeStringify);

export async function markdownToHTML(md: string): Promise<string> {
  return String(await md2html.process(md));
}
