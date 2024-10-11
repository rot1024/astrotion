import type { QueryDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";
import { NotionToMarkdown } from "notion-to-md";

import { buildDatabase, buildPost, isValidPage } from "./conv";
import { downloadImages } from "./download";
import type {
  Database,
  Post,
  PostContent,
  Client as ClientType,
} from "./interfaces";
import { markdownToHTML } from "./md2html";
import { transform } from "./md2md";
import { type MinimalNotionClient, getAll } from "./notion";
import { newNotionToMarkdown } from "./notion-md";
import { paginate } from "./utils";

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
    this.databaseId = databaseId;
    this.debug = debug || false;
    this.n2m = newNotionToMarkdown(client);
  }

  async listPosts(
    page: string,
    filter?: (p: Post, i: number, a: Post[]) => boolean,
  ): Promise<{
    database: Database;
    posts: Post[];
    pageCount: number;
    pageInt: number;
  }> {
    const { database, posts } = await this.getDatabaseAndPosts();
    const filteredPosts = filter ? posts.filter(filter) : posts;
    const { pageCount, pageInt, pagePosts } = paginate(filteredPosts, page);
    await downloadImages(database?.images, ...pagePosts.map((p) => p.images));

    return {
      database,
      pageCount,
      pageInt,
      posts: pagePosts,
    };
  }

  async getPost(slug: string) {
    const { database, post } = await this.getDatabaseAndPostBySlug(slug);
    if (!post) throw new Error(`Post not found: ${slug}`);

    const content = post ? await this.getPostContent(post.id) : undefined;
    const html = content ? await markdownToHTML(content.markdown) : undefined;
    await downloadImages(content?.images, post?.images, database?.images);

    return {
      database,
      post,
      html,
    };
  }

  async getDatabaseAndPosts(): Promise<{ database: Database; posts: Post[] }> {
    return Promise.all([this.getDatabase(), this.getAllPosts()]).then(
      ([database, posts]) => ({ database, posts }),
    );
  }

  async getDatabaseAndPostBySlug(
    slug: string | undefined,
  ): Promise<{ database: Database; post: Post | undefined }> {
    return Promise.all([
      this.getDatabase(),
      slug ? this.getPostBySlug(slug) : Promise.resolve(undefined),
    ]).then(([database, post]) => ({ database, post }));
  }

  async getAllTags(): Promise<string[]> {
    const posts = await this.getAllPosts();
    const tags = new Set<string>();
    posts.forEach((post) => post.tags.forEach((tag) => tags.add(tag.name)));
    return Array.from(tags);
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
    const transformed = transform(mdblocks, posts);

    const markdown = this.n2m.toMarkdownString(transformed);

    return {
      markdown: markdown.parent,
      images,
    };
  }
}
