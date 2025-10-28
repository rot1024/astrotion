import fs from "node:fs";

import type { APIRoute, GetStaticPaths } from "astro";
import { defaultFonts, generate } from "ezog";
import sharp from "sharp";

import config from "../../config";
import { getAllPosts, getPostOnly } from "../../notion";

const fonts = defaultFonts(700);
const ogBaseBuffer = await fs.promises
  .readFile(config.og?.baseImagePath || "public/og-base.png")
  .catch(() => null);

export type Props = {
  slug: string;
};

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getAllPosts();
  return posts.map((p) => ({ params: { slug: p.slug } })) ?? [];
};

const imageWidth = 1200;
const imageHeight = 630;
const imagePadding = 80;
const fontSize = 60;
const lineHeight = 80;

export const GET: APIRoute<Props> = async ({ params }) => {
  const post = await getPostOnly(params.slug || "");
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
              width: imageWidth,
              height: imageHeight,
            },
          ]
        : []),
      {
        type: "textBox",
        text: post.title,
        x: imagePadding,
        y: imagePadding,
        // y: imageHeight / 2 - lineHeight,
        width: imageWidth - imagePadding * 2,
        fontFamily: [...fonts.map((font) => font.name)],
        fontSize,
        lineHeight,
        color: "#000",
        ...config.og?.titleStyle,
      },
    ],
    {
      width: imageWidth,
      height: imageHeight,
      fonts: [...fonts],
      background: config.og?.backgroundColor || "#fff",
    },
  );

  const webp = await sharp(image).webp().toBuffer();
  return new Response(new Uint8Array(webp));
};
