import rss from "@astrojs/rss";

import { postUrl, client } from "../../../lib";

export async function getStaticPaths() {
  const posts = await client.getAllPosts();
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

export async function GET({ params }: { params: { tag: string } }) {
  const [posts, db] = await Promise.all([
    client.getAllPosts(),
    client.getDatabase(),
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
