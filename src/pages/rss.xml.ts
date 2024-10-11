import rss from "@astrojs/rss";

import { client, postUrl } from "../lib";

export async function GET() {
  const [posts, db] = await Promise.all([
    client.getAllPosts(),
    client.getDatabase(),
  ]);

  return rss({
    title: db.title,
    description: db.description,
    site: import.meta.env.SITE,
    items: posts.map((post) => ({
      link: postUrl(post.slug),
      title: post.title,
      description: post.excerpt,
      pubDate: new Date(post.date),
    })),
  });
}
