import type {
  DatabaseObjectResponse,
  PageObjectResponse,
  PartialDatabaseObjectResponse,
  PartialPageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

import type { Post } from "../interfaces";

import type { Properties } from "./utils";

export function isValidPage(
  p:
    | PageObjectResponse
    | PartialPageObjectResponse
    | PartialDatabaseObjectResponse
    | DatabaseObjectResponse,
): p is PageObjectResponse {
  const properties = "properties" in p ? p.properties : null;
  return (
    !!properties &&
    properties.Page.type === "title" &&
    properties.Page.title.length > 0 &&
    properties.Slug.type === "rich_text" &&
    properties.Slug.rich_text.length > 0 &&
    properties.Date.type === "date"
  );
}

export function buildPost(pageObject: PageObjectResponse): Post {
  const { properties, id, icon, cover } = pageObject;

  const post: Post = {
    id: id,
    title: getRichText(properties.Page),
    icon: getUrl(icon),
    cover: getUrl(cover),
    slug: getRichText(properties.Slug),
    date:
      properties.Date.type === "date" ? properties.Date.date?.start ?? "" : "",
    tags:
      properties.Tags.type === "multi_select"
        ? properties.Tags.multi_select
        : [],
    excerpt: getRichText(properties.Excerpt),
    featuredImage: getUrl(properties.featuredImage),
    rank: properties.Rank.type === "number" ? properties.Rank.number ?? 0 : 0,
    updatedAt:
      properties.UpdatedAt.type === "last_edited_time"
        ? properties.UpdatedAt.last_edited_time
        : "",
    raw: pageObject,
  };

  return post;
}

function getRichText(p: Properties | undefined): string {
  if (!p) return "";
  return p.type === "rich_text"
    ? p.rich_text.map((richText) => richText.plain_text).join("")
    : p.type === "title" && p.title.length > 0
    ? p.title[0].plain_text
    : "";
}

function getUrl(
  p:
    | PageObjectResponse["icon"]
    | PageObjectResponse["cover"]
    | Properties
    | undefined,
): string {
  if (!p) return "";
  if (p.type === "external") return p.external.url;
  if (p.type === "file") return p.file.url;
  if (p.type === "files") {
    const f = p.files[0];
    if (f.type === "external") return f.external.url;
    if (f.type === "file") return f.file.url;
  }
  return "";
}
