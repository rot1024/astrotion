import type {
  DatabaseObjectResponse,
  GetDatabaseResponse,
  PageObjectResponse,
  PartialDatabaseObjectResponse,
  PartialPageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

import { DISABLE_DB_DESCRIPTION } from "../constants";
import type { Database, Post } from "../interfaces";

import { fileUrlToAssetUrl, type Properties } from "./utils";

export function buildDatabase(res: GetDatabaseResponse): Database {
  if (!("title" in res)) throw new Error("invalid database");

  const { url: iconUrl } = getUrlFromIconAndCover(res.icon) ?? {};
  const { url: coverUrl } = getUrlFromIconAndCover(res.cover) ?? {};
  const iconAssetUrl = fileUrlToAssetUrl(iconUrl);
  const coverAssetUrl = fileUrlToAssetUrl(iconUrl);

  const images = new Map<string, string>();
  if (iconUrl && iconAssetUrl) images.set(iconUrl, iconAssetUrl);
  if (coverUrl && coverAssetUrl) images.set(coverUrl, coverAssetUrl);

  return {
    title: res.title.map((text) => text.plain_text).join(""),
    description: DISABLE_DB_DESCRIPTION
      ? ""
      : res.description.map((text) => text.plain_text).join(""),
    icon: iconAssetUrl || iconUrl,
    cover: coverAssetUrl || coverUrl,
    images,
  };
}

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

export function buildPost(pageObject: PageObjectResponse): {
  post: Post;
  iconUrl?: string;
  coverUrl?: string;
  featuredImageUrl?: string;
  iconExpiryTime?: Date;
  coverExpiryTime?: Date;
  featuredImageExpiryTime?: Date;
} {
  const { properties, id, icon, cover } = pageObject;
  const { url: iconUrl, expiryTime: iconExpiryTime } =
    getUrlFromIconAndCover(icon) ?? {};
  const { url: coverUrl, expiryTime: coverExpiryTime } =
    getUrlFromIconAndCover(cover) ?? {};
  const { url: featuredImageUrl, expiryTime: featuredImageExpiryTime } =
    getUrlFromIconAndCover(cover) ?? {};
  const iconAssetUrl = fileUrlToAssetUrl(iconUrl);
  const coverAssetUrl = fileUrlToAssetUrl(iconUrl);
  const featuredImageAssetUrl = fileUrlToAssetUrl(featuredImageUrl);

  const images = new Map<string, string>();
  if (iconUrl && iconAssetUrl) images.set(iconUrl, iconAssetUrl);
  if (coverUrl && coverAssetUrl) images.set(coverUrl, coverAssetUrl);
  if (featuredImageUrl && featuredImageAssetUrl)
    images.set(featuredImageUrl, featuredImageAssetUrl);

  const post: Post = {
    id: id,
    title: getRichText(properties.Page),
    icon: iconAssetUrl || iconUrl,
    cover: coverAssetUrl || coverUrl,
    featuredImage: featuredImageAssetUrl || featuredImageUrl,
    slug: getRichText(properties.Slug),
    date:
      properties.Date.type === "date" ? properties.Date.date?.start ?? "" : "",
    tags:
      properties.Tags.type === "multi_select"
        ? properties.Tags.multi_select
        : [],
    excerpt: getRichText(properties.Excerpt),
    rank: properties.Rank.type === "number" ? properties.Rank.number ?? 0 : 0,
    updatedAt:
      properties.UpdatedAt.type === "last_edited_time"
        ? properties.UpdatedAt.last_edited_time
        : "",
    images,
  };

  return {
    post,
    iconUrl,
    coverUrl,
    featuredImageUrl,
    iconExpiryTime,
    coverExpiryTime,
    featuredImageExpiryTime,
  };
}

function getRichText(p: Properties | undefined): string {
  if (!p) return "";
  return p.type === "rich_text"
    ? p.rich_text.map((richText) => richText.plain_text).join("")
    : p.type === "title" && p.title.length > 0
    ? p.title[0].plain_text
    : "";
}

export function getUrlFromIconAndCover(
  iconOrCover:
    | PageObjectResponse["icon"]
    | PageObjectResponse["cover"]
    | Properties
    | undefined,
): { url: string; expiryTime?: Date } | undefined {
  if (iconOrCover?.type === "external") {
    return {
      url: iconOrCover.external.url,
    };
  }

  if (iconOrCover?.type === "file") {
    return {
      url: iconOrCover.file.url,
      expiryTime: new Date(iconOrCover.file.expiry_time),
    };
  }

  if (iconOrCover?.type === "files") {
    const f = iconOrCover.files[0];
    if (f.type === "external") return { url: f.external.url };
    if (f.type === "file")
      return { url: f.file.url, expiryTime: new Date(f.file.expiry_time) };
  }

  return;
}
