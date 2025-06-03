import { Client, downloadImages, downloadImagesWithRetry, type Post } from "notiondown";

import config, { auth, databaseId, debug } from "./config";
import { ASSET_DIR, CACHE_DIR_ASSETS, CACHE_DIR_NOTION } from "./constants";
import { postUrl } from "./utils";

const pageSize = config.postsPerPage ?? 20;

if (!auth || !databaseId) {
  throw new Error("NOTION_API_SECRET and DATABASE_ID environment variables must be set.");
}

const client = new Client({
  ...config.notiondown,
  auth,
  databaseId,
  cacheDir: CACHE_DIR_NOTION,
  imageDir: "/" + ASSET_DIR,
  debug,
  internalLink: (post) => postUrl(post.slug),
});

await client.loadCache();

export async function getAllTags() {
  const posts = await client.getAllPosts();
  const tags = new Set<string>();
  for (const post of posts) {
    if (post.tags) {
      post.tags.filter(t => t.name).forEach(t => tags.add(t.name));
    }
  }
  return Array.from(tags).sort();
}

export async function listPosts(page: number, filter?: (p: Post) => boolean) {
  const res = await client.getDatabaseAndAllPosts();
  if (filter) {
    res.posts = res.posts.filter(filter);
  }

  const totalPosts = res.posts.length;
  const totalPages = Math.ceil(totalPosts / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedPosts = res.posts.slice(startIndex, endIndex);

  await donwloadImages(res.database.images);
  await donwloadPostImages(res.posts);

  return {
    database: res.database,
    posts: paginatedPosts,
    totalPosts,
    totalPages,
    currentPage: page,
    pageSize,
  };
}

export async function getPostOnly(slug: string) {
  const posts = await client.getAllPosts();
  const post = posts.find((p) => p.slug === slug);
  if (!post) {
    throw new Error(`Post with slug "${slug}" not found.`);
  }

  return post;
}

export async function getPost(slug: string) {
  const { database, posts, images } = await client.getDatabaseAndAllPosts();
  const post = posts.find((p) => p.slug === slug);
  if (!post) {
    throw new Error(`Post with slug "${slug}" not found.`);
  }

  const content = await client.getPostContent(post.id);
  for (const [key, value] of content.images?.entries() || []) {
    images.set(key, value);
  }
  await donwloadImages(images, post.id);

  return {
    post,
    database,
    html: content.html,
  }
}

export function getAllPosts() {
  return client.getAllPosts();
}

export function getDatabaseAndAllPosts() {
  return client.getDatabaseAndAllPosts();
}

export async function donwloadImages(images: Map<string, string> | Record<string, string> | null | undefined, postId?: string) {
  const imageMap = images instanceof Map ? images : new Map(Object.entries(images || {}));
  if (imageMap.size === 0) return;

  if (!postId) {
    await downloadImages(imageMap, {
      debug,
      dir: CACHE_DIR_ASSETS,
    });
    return;
  }

  await downloadImagesWithRetry(imageMap, postId, client, {
    debug,
    dir: CACHE_DIR_ASSETS,
  });
}

export async function donwloadPostImages(posts: Post[]) {
  for (const post of posts) {
    if (!post.images || Object.keys(post.images).length === 0) return;

    await downloadImagesWithRetry(new Map(Object.entries(post.images)), post.id, client, {
      debug,
      dir: CACHE_DIR_ASSETS,
    });
  }
}

export { client };
