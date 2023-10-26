import type { MdBlock } from "notion-to-md/build/types";

import type { Post } from "../interfaces";

import { fileUrlToAssetUrl } from "./utils";

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
    const newUrl = fileUrlToAssetUrl(imageUrl);
    if (newUrl && newUrl !== imageUrl) {
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
