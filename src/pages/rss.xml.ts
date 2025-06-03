import rss from "@astrojs/rss";

import { site } from "../config";
import { getDatabaseAndAllPosts } from "../notion";
import { postUrl } from "../utils";

export async function GET(context: { site?: string }) {
  const { database, posts } = await getDatabaseAndAllPosts();

  return rss({
    title: database.title,
    description: database.description,
    site: context.site || site,
    items: posts.map((post) => ({
      link: postUrl(post.slug),
      title: post.title,
      description: post.excerpt,
      pubDate: new Date(post.date),
    })),
  });
}
