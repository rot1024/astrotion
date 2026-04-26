import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

import { site } from "../../../config";
import { getDatabase } from "@astrotion/astro/content";
import { postUrl } from "../../../utils";

export async function getStaticPaths() {
  const posts = await getCollection("posts");
  const tags = new Set<string>();
  posts.forEach((post) =>
    post.data.tags.forEach((tag) => {
      tags.add(tag.name);
    }),
  );

  return Array.from(tags).map((tag) => ({
    params: { tag },
  }));
}

export async function GET({
  params,
  site: ctxsite,
}: {
  params: { tag: string };
  site: string;
}) {
  const database = await getDatabase();
  const posts = await getCollection("posts");

  return rss({
    title: database.title,
    description: database.description,
    site: ctxsite || site,
    items: posts
      .filter((post) => post.data.tags.some((t) => t.name === params.tag))
      .map(({ data: post }) => ({
        link: postUrl(post.slug),
        title: post.title,
        description: post.excerpt,
        pubDate: new Date(post.date),
      })),
  });
}
