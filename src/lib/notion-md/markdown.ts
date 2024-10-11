import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { NotionToMarkdown } from "notion-to-md";
import type { ListBlockChildrenResponseResult } from "notion-to-md/build/types";

import type { MinimalNotionClient } from "../notion";

function notionToMarkdownFrom(client: MinimalNotionClient): NotionToMarkdown {
  return new NotionToMarkdown({
    notionClient: client as any,
  });
}

function registerTransformers(n2m: NotionToMarkdown): void {
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
}

export function newNotionToMarkdown(
  client: MinimalNotionClient,
): NotionToMarkdown {
  const n2m = notionToMarkdownFrom(client);
  registerTransformers(n2m);
  return n2m;
}

export function imageTransformer(
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
