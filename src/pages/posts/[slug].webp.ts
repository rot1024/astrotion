import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import type { APIRoute, GetStaticPaths } from "astro";
import { defaultFonts, generate } from "ezog";
import sharp from "sharp";

import config from "../../config";
import { CACHE_DIR } from "../../constants";
import { getAllPosts, getPostOnly } from "../../notion";

const fonts = defaultFonts(700);
const ogBaseBuffer = await fs.promises
  .readFile(config.og?.baseImagePath || "public/og-base.png")
  .catch(() => null);

// Generate hash of base image for cache invalidation
const ogBaseHash = ogBaseBuffer
  ? crypto.createHash("sha256").update(ogBaseBuffer).digest("hex")
  : "no-base";

// Generate hash of ezog configuration for cache invalidation
const imageWidth = 1200;
const imageHeight = 630;
const imagePadding = 80;
const fontSize = 60;
const lineHeight = 80;

const configHash = crypto
  .createHash("sha256")
  .update(
    JSON.stringify({
      imageWidth,
      imageHeight,
      imagePadding,
      fontSize,
      lineHeight,
      backgroundColor: config.og?.backgroundColor || "#fff",
      titleStyle: config.og?.titleStyle || {},
    }),
  )
  .digest("hex");

const cacheDir = path.join(CACHE_DIR, "og-images");

// Ensure cache directory exists
await fs.promises.mkdir(cacheDir, { recursive: true }).catch(() => {});

export type Props = {
  slug: string;
};

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getAllPosts();
  return posts.map((p) => ({ params: { slug: p.slug } })) ?? [];
};

export const GET: APIRoute<Props> = async ({ params }) => {
  const post = await getPostOnly(params.slug || "");
  if (!post) throw new Error("Post not found");

  // Generate cache key hash based on post title, base image, and configuration
  // All inputs are hashed together to create a unique cache filename
  const cacheKey = crypto
    .createHash("sha256")
    .update(`${post.title}-${ogBaseHash}-${configHash}`)
    .digest("hex");
  const cachePath = path.join(cacheDir, `${cacheKey}.webp`);

  // Check if cached file exists
  try {
    const cachedBuffer = await fs.promises.readFile(cachePath);
    return new Response(new Uint8Array(cachedBuffer));
  } catch {
    // Cache miss, continue to generate
  }

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

  // Save to cache
  await fs.promises.writeFile(cachePath, webp).catch(() => {});

  return new Response(new Uint8Array(webp));
};
