import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

import { site } from "../config";
import { getDatabase } from "@astrotion/astro/content";
import { postUrl } from "../utils";

export async function GET(context: { site?: string }) {
  const database = await getDatabase();
  const posts = await getCollection("posts");

  return rss({
    title: database.title,
    description: database.description,
    site: context.site || site,
    items: posts.map(({ data: post }) => ({
      link: postUrl(post.slug),
      title: post.title,
      description: post.excerpt,
      pubDate: new Date(post.date),
    })),
  });
}
