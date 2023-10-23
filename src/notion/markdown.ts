import path from "node:path";

import type { MdBlock } from "notion-to-md/build/types";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import type { Post } from "../interfaces";

export const assetsDir = "/assets";

export const md2html = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeStringify);

export function transformMdBlocks(
  blocks: MdBlock[],
  ...transformers: ((block: MdBlock) => MdBlock)[]
): MdBlock[] {
  return blocks.map((block) => {
    if (block.children.length > 0) {
      block.children = transformMdBlocks(block.children, ...transformers);
    }

    for (const transformer of transformers) {
      block = transformer(block);
    }
    return block;
  });
}

// transforms image url with expiration time to internal url
export function transformMdImageBlock(
  block: MdBlock,
  imageUrls: Map<string, string>,
): MdBlock {
  if (block.type !== "image") return block;

  const imageMarkdown = block.parent;
  const imageUrl = imageMarkdown.match(/!\[.*\]\((.*)\)/)?.[1];
  if (imageUrl) {
    const newUrl = toInternalImageUrl(imageUrl);
    if (newUrl) {
      imageUrls.set(imageUrl, newUrl);
      block.parent = block.parent.replace(imageUrl, newUrl);
    }
  }

  return block;
}

// transforms link_to_page to slug link
export function transformMdLinkBlock(block: MdBlock, posts: Post[]): MdBlock {
  if (block.type !== "link_to_page") return block;

  const linkMarkdown = block.parent;
  const pageId = linkMarkdown.match(/\[(.*)\]\((.*)\)/)?.[2];
  if (pageId) {
    const post = posts.find((post) => post.id === pageId);
    if (post) {
      block.parent = block.parent.replace(pageId, post.slug);
    }
  }

  return block;
}

function toInternalImageUrl(imageUrl: string): string {
  const url = new URL(imageUrl);
  if (!url.searchParams.has("X-Amz-Expires")) return "";

  const filename = url.pathname.split("/").at(-1);
  if (!filename) return "";

  // replace ext to webp
  const ext = path.extname(filename);
  const finalFilename = ext ? filename.replace(ext, ".webp") : filename;

  const newUrl = path.join(assetsDir, finalFilename);
  return newUrl;
}
