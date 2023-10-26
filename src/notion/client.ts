import type { QueryDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";
import { NotionToMarkdown } from "notion-to-md";

import type {
  Database,
  Post,
  PostContent,
  Client as ClientType,
} from "../interfaces";
import { debug } from "../utils";

import { buildDatabase, buildPost, isValidPage } from "./conv";
import {
  transformMdBlocks,
  transformMdImageBlock,
  transformMdLinkBlock,
} from "./markdown";
import { newNotionToMarkdown, type MinimalNotionClient } from "./minimal";
import { getAll } from "./utils";

export class Client implements ClientType {
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
    return buildDatabase(res);
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
    return posts;
  }

  async getPostById(postId: string | undefined): Promise<Post | undefined> {
    if (!postId) return undefined;
    const posts = await this.getAllPosts();
    return posts.find((post) => post.id === postId);
  }

  async getPostBySlug(slug: string): Promise<Post | undefined> {
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

    const markdown = this.n2m.toMarkdownString(transformed);
    return {
      markdown: markdown.parent,
      images,
    };
  }

  #log(...args: any[]): void {
    debug("Client:", ...args);
  }
}
