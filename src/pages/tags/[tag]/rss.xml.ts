import rss from "@astrojs/rss";

import defaultClient from "../../../notion";
import { postUrl } from "../../../utils";

export async function GET({ params }: { params: { tag: string } }) {
  const [posts, db] = await Promise.all([
    defaultClient.getAllPosts(),
    defaultClient.getDatabase(),
  ]);

  return rss({
    title: db.title,
    description: db.description,
    site: import.meta.env.SITE,
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
