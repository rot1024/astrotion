import fs from "node:fs";

import type { APIRoute, GetStaticPaths } from "astro";
import { defaultFonts, generate } from "ezog";
import sharp from "sharp";

import config from "../../config";
import client from "../../notion";

const fonts = defaultFonts(700);
const ogBaseBuffer = await fs.promises
  .readFile(config.og?.baseImagePath || "public/og-base.png")
  .catch(() => null);

export type Props = {
  slug: string;
};

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await client.getAllPosts();
  return posts.map((p) => ({ params: { slug: p.slug } })) ?? [];
};

export const GET: APIRoute<Props> = async ({ params }) => {
  const post = await client.getPostBySlug(params.slug || "");
  if (!post) throw new Error("Post not found");

  const image = await generate(
    [
      ...(ogBaseBuffer
        ? [
            {
              type: "image" as const,
              buffer: ogBaseBuffer,
              x: 0,
              y: 0,
              width: 1200,
              height: 630,
            },
          ]
        : []),
      {
        type: "textBox",
        text: post.title,
        x: 0,
        y: 275,
        width: 1200,
        fontFamily: [...fonts.map((font) => font.name)],
        fontSize: 60,
        lineHeight: 80,
        lineClamp: 1,
        align: "center",
        color: config.og?.fontColor || "#000",
      },
    ],
    {
      width: 1200,
      height: 630,
      fonts: [...fonts],
      background: config.og?.backgroundColor || "#fff",
    },
  );

  const webp = await sharp(image).webp().toBuffer();
  return new Response(webp.buffer);
};
