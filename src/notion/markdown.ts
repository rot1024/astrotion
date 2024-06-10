import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { NotionToMarkdown } from "notion-to-md";
import type {
  ListBlockChildrenResponseResult,
  MdBlock,
} from "notion-to-md/build/types";

import type { Post } from "../interfaces";

import type { MinimalNotionClient } from "./minimal";
import { fileUrlToAssetUrl } from "./utils";

export function newNotionToMarkdown(
  client: MinimalNotionClient,
): NotionToMarkdown {
  const n2m = new NotionToMarkdown({
    notionClient: client as any,
  });

  n2m.setCustomTransformer("image", imageTransformer);

  n2m.setCustomTransformer("embed", (block) => {
    const b = block as BlockObjectResponse;
    if (b.type !== "embed") return false;
    return b.embed.url;
  });

  n2m.setCustomTransformer("video", (block) => {
    const b = block as BlockObjectResponse;
    if (b.type !== "video" || b.video.type !== "external") return false;
    return b.video.external.url;
  });

  n2m.setCustomTransformer("bookmark", (block) => {
    const b = block as BlockObjectResponse;
    if (b.type !== "bookmark") return false;
    return b.bookmark.url;
  });

  return n2m;
}

function imageTransformer(
  block: ListBlockChildrenResponseResult,
): string | boolean {
  const b = block as BlockObjectResponse;
  if (b.type !== "image") return false;

  let link = "";
  if (b.image.type === "external") {
    link = b.image.external.url;
  } else if (b.image.type === "file") {
    link = b.image.file.url;
  }

  let alt = "";
  const caption = b.image.caption
    .map((item) => item.plain_text)
    .join("")
    .trim();
  if (caption.length > 0) {
    alt = caption;
  }

  return link ? `![${alt}](${link})` : false;
}

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
  const imageUrl = imageMarkdown.match(/!\[.*?\]\((.+)\)/s)?.[1];
  if (imageUrl) {
    const newUrl = fileUrlToAssetUrl(imageUrl, block.blockId);
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
