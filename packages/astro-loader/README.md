# @astrotion/loader

Astro Content Layer loader for [Notion](https://www.notion.so/) databases,
powered by [notiondown](https://github.com/rot1024/notiondown).

## Install

```sh
npm install @astrotion/loader notiondown
```

`sharp` is an optional peer of `notiondown`. Install it if you want WebP
optimization at download time:

```sh
npm install sharp
```

## Usage

```ts
// src/content.config.ts
import { defineCollection, z } from "astro:content";
import { notiondownLoader } from "@astrotion/loader";

export const collections = {
  posts: defineCollection({
    loader: notiondownLoader({
      dataSourceId: process.env.DATA_SOURCE_ID!,
      auth: process.env.NOTION_API_SECRET!,
    }),
    schema: z.object({
      title: z.string(),
      slug: z.string(),
      date: z.string(),
      cover: z.string().optional(),
    }),
  }),
};
```

```astro
---
// src/pages/posts/[slug].astro
import { getCollection, render } from "astro:content";

export async function getStaticPaths() {
  const posts = await getCollection("posts");
  return posts.map((post) => ({
    params: { slug: post.data.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await render(post);
---

<article>
  <h1>{post.data.title}</h1>
  {post.data.cover && <img src={post.data.cover} alt="" />}
  <Content />
</article>
```

## Defaults

| Option | Default |
| --- | --- |
| `cacheDir` | `./node_modules/.cache/notiondown` (auto-cached on Cloudflare/Vercel/Netlify) |
| `imageDir` | `./public/notion` (served as-is by Astro) |
| `publicPath` | `/notion` |

Images are downloaded by notiondown's pipeline. When `sharp` is installed,
they are converted to WebP at download time. Otherwise the original bytes
are saved.

## Incremental updates

The loader keeps a per-post digest based on `updatedAt`. Posts whose digest
is unchanged are not re-rendered on the next build, so subsequent runs are
fast on large databases. Posts removed from Notion are deleted from the
collection.
