import {
  DATABASE_ENTRY_ID,
  databaseLoader,
  notiondownLoader,
  type DatabaseLoaderOptions,
  type NotiondownLoaderOptions,
} from "@astrotion/loader";
import type { CollectionEntry } from "astro:content";
import { defineCollection, getEntry, z } from "astro:content";

type ZodType = ReturnType<typeof z.string>;

import {
  DEFAULT_CACHE_DIR,
  DEFAULT_NOTION_CACHE_DIR,
  DEFAULT_POSTS_DIR,
  DEFAULT_PUBLIC_DIR_NAME,
} from "./lib/paths.ts";

export type PostsCollectionOptions = NotiondownLoaderOptions & {
  /**
   * Filesystem directory where Notion assets are downloaded.
   * Should match the integration's `cacheDir` option. Defaults to
   * `node_modules/.astro/.astrotion/static`.
   */
  imageDir?: string;
  /**
   * URL-visible directory name for assets. Should match the integration's
   * `publicDirName`. Defaults to `static`.
   */
  publicDirName?: string;
};

/**
 * Returns a `defineCollection` config for the standard "posts" collection.
 * Uses `notiondownLoader` with sensible defaults and a schema that wires
 * `cover` and `featuredImage` into Astro's `image()` helper so they go
 * through the image optimization pipeline.
 */
export function postsCollection(options: PostsCollectionOptions) {
  const {
    publicDirName = DEFAULT_PUBLIC_DIR_NAME,
    cacheDir = DEFAULT_NOTION_CACHE_DIR,
    imageDir = DEFAULT_CACHE_DIR,
    postsDir = DEFAULT_POSTS_DIR,
    ...rest
  } = options;

  return defineCollection({
    loader: notiondownLoader({
      ...rest,
      cacheDir,
      imageDir,
      postsDir,
      assetsDir: "/" + publicDirName,
    }),
    schema: ({ image }: { image: () => ZodType }) =>
      z.object({
        id: z.string(),
        title: z.string(),
        slug: z.string(),
        date: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
        excerpt: z.string(),
        tags: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              color: z.string().optional(),
            }),
          )
          .default([]),
        rank: z.number().default(0),
        lang: z.string().optional(),
        icon: z.string().optional(),
        cover: image().optional(),
        featuredImage: image().optional(),
        additionalProperties: z.record(z.string(), z.unknown()).optional(),
        parentId: z.string().nullable().optional(),
        pathSegments: z.array(z.string()).optional(),
        childIds: z.array(z.string()).optional(),
      }),
  });
}

export type DatabaseCollectionOptions = DatabaseLoaderOptions;

/**
 * Returns a `defineCollection` config for the "database" collection, a
 * single-entry collection holding the Notion database's metadata
 * (title / description / icon / cover). Read it with
 * `getEntry("database", "default")` (or via the `getDatabase` helper).
 */
export function databaseCollection(options: DatabaseCollectionOptions) {
  const { cacheDir = DEFAULT_NOTION_CACHE_DIR, ...rest } = options;
  return defineCollection({
    loader: databaseLoader({ ...rest, cacheDir }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      icon: z.string().optional(),
      cover: z.string().optional(),
    }),
  });
}

export type PostEntry = CollectionEntry<"posts">;
export type DatabaseEntry = CollectionEntry<"database">;
export type DatabaseData = DatabaseEntry["data"];

/**
 * Reads the single database metadata entry created by `databaseCollection`.
 * Returns `undefined` if the consumer has not registered the collection.
 */
export async function getDatabase(): Promise<DatabaseData | undefined> {
  const entry = await getEntry("database" as never, DATABASE_ENTRY_ID as never);
  return (entry as DatabaseEntry | undefined)?.data;
}

export type Pagination<T> = {
  posts: T[];
  totalPosts: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

export function paginate<T>(
  items: T[],
  page: number,
  pageSize = 20,
): Pagination<T> {
  const totalPosts = items.length;
  const totalPages = Math.max(1, Math.ceil(totalPosts / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    posts: items.slice(start, start + pageSize),
    totalPosts,
    totalPages,
    currentPage,
    pageSize,
  };
}

export function sortPostsByDate(posts: PostEntry[]): PostEntry[] {
  return [...posts].sort(
    (a, b) =>
      new Date(b.data.date).valueOf() - new Date(a.data.date).valueOf(),
  );
}

export function getAllTags(posts: PostEntry[]): string[] {
  const tags = new Set<string>();
  for (const entry of posts) {
    for (const t of entry.data.tags) {
      if (t.name) tags.add(t.name);
    }
  }
  return Array.from(tags).sort();
}
