import type { QueryDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";
import { NotionToMarkdown } from "notion-to-md";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import type { Post } from "../interfaces";

import { buildPost, isValidPage } from "./conv";
import { newNotionToMarkdown, type MinimalNotionClient } from "./minimal";
import { getAll } from "./utils";

export class Client {
  client: MinimalNotionClient;
  n2m: NotionToMarkdown;
  databaseId: string;

  constructor(client: MinimalNotionClient, databaseId: string) {
    this.client = client;
    this.n2m = newNotionToMarkdown(client, {});
    this.databaseId = databaseId;
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

    return results.filter(isValidPage).map(buildPost);
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

  async getPostContent(postId: string): Promise<string> {
    const mdblocks = await this.n2m.pageToMarkdown(postId);
    const mdString = this.n2m.toMarkdownString(mdblocks);
    const file = await md2html.process(mdString.parent);
    return String(file);
  }
}

const md2html = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeStringify);
