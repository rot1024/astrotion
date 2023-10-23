import fs from "node:fs";
import path from "node:path";

import type { QueryDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";
import { PromisePool } from "@supercharge/promise-pool";
import { NotionToMarkdown } from "notion-to-md";
import sharp from "sharp";

import type { Database, Post, PostContent } from "../interfaces";

import { buildDatabase, buildPost, isValidPage } from "./conv";
import {
  md2html,
  transformMdBlocks,
  transformMdImageBlock,
  transformMdLinkBlock,
} from "./markdown";
import { newNotionToMarkdown, type MinimalNotionClient } from "./minimal";
import { getAll } from "./utils";

const assetsCacheDir = ".astro/.astrotion/assets";
const downloadConrurrency = 3;

export class Client {
  client: MinimalNotionClient;
  n2m: NotionToMarkdown;
  databaseId: string;
  debug = false;

  constructor(
    client: MinimalNotionClient,
    databaseId: string,
    debug?: boolean,
  ) {
    this.client = client;
    this.n2m = newNotionToMarkdown(client, {});
    this.databaseId = databaseId;
    this.debug = debug || false;
  }

  async getDatabase(): Promise<Database> {
    const res = await this.client.databases.retrieve({
      database_id: this.databaseId,
    });
    const { database } = buildDatabase(res);

    // TODO: download images
    return database;
  }

  async getAllPosts(): Promise<Post[]> {
    const params: QueryDatabaseParameters = {
      database_id: this.databaseId,
      filter: {
        and: [
          {
            property: "Published",
            checkbox: {
              equals: true,
            },
          },
          {
            property: "Date",
            date: {
              on_or_before: new Date().toISOString(),
            },
          },
        ],
      },
      sorts: [
        {
          property: "Date",
          direction: "descending",
        },
      ],
      page_size: 100,
    };

    const results = await getAll((cursor) =>
      this.client.databases.query({
        ...params,
        start_cursor: cursor,
      }),
    );

    const posts = results.filter(isValidPage).map(buildPost);

    // TODO: download images
    return posts.map((p) => p.post);
  }

  async getPostById(postId: string | undefined): Promise<Post | undefined> {
    if (!postId) return undefined;
    const posts = await this.getAllPosts();
    return posts.find((post) => post.id === postId);
  }

  async getPostBySlug(slug: string | undefined): Promise<Post | undefined> {
    if (!slug) return undefined;
    const posts = await this.getAllPosts();
    return posts.find((post) => post.slug === slug);
  }

  async getPostContent(postId: string): Promise<PostContent> {
    const posts = await this.getAllPosts();
    const mdblocks = await this.n2m.pageToMarkdown(postId);

    const images = new Map<string, string>();
    const transformed = transformMdBlocks(
      mdblocks,
      (block) => transformMdImageBlock(block, images),
      (block) => transformMdLinkBlock(block, posts),
    );

    const mdString = this.n2m.toMarkdownString(transformed);
    const file = await md2html.process(mdString.parent);
    return {
      html: String(file),
      images,
    };
  }

  async downloadImages(images: Map<string, string> | undefined): Promise<void> {
    if (!images) return;

    await fs.promises.mkdir(assetsCacheDir, { recursive: true });

    const { errors } = await PromisePool.withConcurrency(downloadConrurrency)
      .for(images)
      .process(async ([imageUrl, localUrl]) => {
        const localDest = path.join("public", localUrl);

        if (await fs.promises.stat(localDest).catch(() => null)) {
          this.#log(`download skipped: ${imageUrl} -> ${localDest}`);
          return;
        }

        this.#log(`download: ${imageUrl} -> ${localDest}`);

        const res = await fetch(imageUrl);
        if (res.status !== 200) {
          throw new Error(
            `Failed to download ${imageUrl} due to statu code ${res.status}`,
          );
        }

        const body = await res.arrayBuffer();

        // optimize images
        const optimzied = await sharp(body).rotate().webp().toBuffer();
        this.#log(
          "image optimized",
          localDest,
          `${body.byteLength} bytes -> ${optimzied.length} bytes`,
          `(${Math.floor(optimzied.length / body.byteLength) * 100}%)`,
        );

        await fs.promises.writeFile(localDest, optimzied);
      });

    if (errors.length > 0) {
      throw new Error(
        `Failed to download images: ${errors.map((e) => e.message).join(", ")}`,
      );
    }
  }

  #log(...args: any[]): void {
    if (this.debug) console.debug("Client:", ...args);
  }
}
