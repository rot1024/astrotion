import rss from "@astrojs/rss";

import { site } from "../../../config";
import { getDatabaseAndAllPosts, getAllPosts } from "../../../notion";
import { postUrl } from "../../../utils";

export async function getStaticPaths() {
  const posts = await getAllPosts();
  const tags = new Set<string>();
  posts.forEach((post) =>
    post.tags.forEach((tag) => {
      tags.add(tag.name);
    }),
  );

  return Array.from(tags).map((tag) => ({
    params: { tag },
  }));
}

export async function GET({ params, site: ctxsite }: { params: { tag: string }, site: string }) {
  const { database, posts } = await getDatabaseAndAllPosts();

  return rss({
    title: database.title,
    description: database.description,
    site: ctxsite || site,
    items: posts
      .filter((post) => post.tags.some((t) => t.name === params.tag))
      .map((post) => ({
        link: postUrl(post.slug),
        title: post.title,
        description: post.excerpt,
        pubDate: new Date(post.date),
      })),
  });
}
