import rehypeFigure from "@microflash/rehype-figure";
import remarkEmbedder from "@remark-embedder/core";
import type { Element, Text, Root } from "hast";
import { h } from "hastscript";
import isUrl from "is-url";
import rehypeExternalLinks from "rehype-external-links";
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
import { visit } from "unist-util-visit";

import { transformers } from "./embed";

export const md2html = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use((remarkEmbedder as any).default as typeof remarkEmbedder, {
    transformers,
  })
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeKatex)
  .use(rehypeMermaid, { strategy: "pre-mermaid" })
  .use(rehypePrism) // put after mermaid
  .use(rehypeFigure)
  .use(autoLinkForFigcaption)
  .use(rehypeExternalLinks, {
    target: "_blank",
    rel: ["noopener", "noreferrer"],
  })
  .use(rehypeStringify);

export async function markdownToHTML(md: string): Promise<string> {
  return String(await md2html.process(md));
}

function autoLinkForFigcaption() {
  return (tree: Root) => {
    visit(
      tree,
      { type: "element", tagName: "figcaption" },
      (figcaption: Element) => {
        figcaption.children.forEach((element) => {
          if (element.type !== "text" && element.type !== "element") return;

          visit(element, "text", (node, index, parent) => {
            const words = node.value.split(/(\s+)/);
            const children = words.map((word) => {
              if (isUrl(word)) {
                return h("a", { href: word }, word);
              } else {
                return { type: "text", value: word } satisfies Text;
              }
            });

            if (typeof index === "number" && parent) {
              parent.children.splice(index, 1, ...children);
            } else {
              figcaption.children = children;
            }
          });
        });
      },
    );
  };
}
