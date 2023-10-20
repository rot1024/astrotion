import fs from "node:fs";
import path from "node:path";

import type {
  ListBlockChildrenResponse,
  QueryDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";

import type { MinimalNotionClient } from "./minimal";

const defaultBaseDir = "./.astro/.notion-cache";

export type Options = {
  base: MinimalNotionClient;
  databaseId: string;
  useFs?: boolean;
  baseDir?: string;
};

export class CacheClient {
  base: MinimalNotionClient;
  databaseId: string;
  useFs: boolean;
  baseDir: string;
  blockChildrenListCache: Map<string, ListBlockChildrenResponse> = new Map();
  databaseQueryCache: QueryDatabaseResponse | undefined;

  constructor(options: Options) {
    this.base = options.base;
    this.databaseId = options.databaseId;
    this.useFs = options?.useFs ?? false;
    this.baseDir = options?.baseDir ?? defaultBaseDir;
    if (this.useFs) {
      fs.mkdirSync(this.baseDir, { recursive: true });
      this.#readAllCache();
    }
  }

  blocks: MinimalNotionClient["blocks"] = {
    children: {
      list: async (args) => {
        const id = args.block_id;
        const blocks = this.blockChildrenListCache.get(id);
        if (blocks) return blocks;

        const res = await this.base.blocks.children.list(args);
        this.blockChildrenListCache.set(id, res);
        if (this.useFs) {
          await this.#writeCache(`blocks-${id}.json`, res);
        }

        return res;
      },
    },
  };

  databases: MinimalNotionClient["databases"] = {
    query: async (args) => {
      // Since this application only uses static queries, the response can simply be cached.
      if (this.databaseQueryCache) return this.databaseQueryCache;

      const res = await this.base.databases.query(args);
      this.databaseQueryCache = res;
      if (this.useFs) {
        await this.#writeCache(`database-${this.databaseId}.json`, res);
      }

      return res;
    },
  };

  async purgeCache(): Promise<void> {
    if (!this.useFs) return;
    await fs.promises.rm(this.baseDir, { recursive: true });
    await fs.promises.mkdir(this.baseDir, { recursive: true });
  }

  async #readAllCache(): Promise<void> {
    const dbid = this.databaseId;
    const dir = await fs.promises.readdir(this.baseDir);
    for (const file of dir) {
      if (
        !file.endsWith(".json") ||
        (!file.startsWith("blocks-") && !file.startsWith(`database-${dbid}`))
      )
        continue;

      const data = await this.#readCache(file);
      if (file.startsWith("blocks-")) {
        const id = file.replace("blocks-", "").replace(".json", "");
        this.blockChildrenListCache.set(id, data);
      } else if (file.startsWith(`database-${dbid}`)) {
        this.databaseQueryCache = data;
      }
    }
  }

  async #readCache<T = any>(name: string): Promise<T> {
    const data = await fs.promises.readFile(path.join(this.baseDir, name));
    return JSON.parse(data.toString());
  }

  async #writeCache(name: string, data: any): Promise<void> {
    if (!this.useFs) return;
    await fs.promises.writeFile(
      path.join(this.baseDir, name),
      JSON.stringify(data),
    );
  }
}
