import fs from "node:fs";
import path from "node:path";

import type {
  ListBlockChildrenResponse,
  QueryDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";

import type { MinimalNotionClient } from "./minimal";
import { getLastEditedTime } from "./utils";

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
  databaseQueryCache: Map<string, QueryDatabaseResponse> = new Map();
  updatedAtMap: Map<string, Date> = new Map();
  cacheUpdatedAtMap: Map<string, Date> = new Map();
  parentMap: Map<string, string> = new Map();

  constructor(options: Options) {
    this.base = options.base;
    this.databaseId = options.databaseId;
    this.useFs = options?.useFs ?? false;
    this.baseDir = options?.baseDir ?? defaultBaseDir;
    if (this.useFs) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  databases: MinimalNotionClient["databases"] = {
    query: async (args) => {
      const databaseId = args.database_id;

      const cache = this.databaseQueryCache.get(databaseId);
      if (cache) {
        console.debug("use cache: database for " + databaseId);
        return cache;
      }

      const res = await this.base.databases.query(args);
      this.databaseQueryCache.set(databaseId, res);

      for (const p of res.results) {
        const lastEditedTime = getLastEditedTime(p);
        if (lastEditedTime) {
          this.updatedAtMap.set(p.id, lastEditedTime);
        }
      }

      await this.#writeMetaCache();
      return res;
    },
  };

  blocks: MinimalNotionClient["blocks"] = {
    children: {
      list: async (args) => {
        const blockId = args.block_id;

        if (this.#canUseCache(blockId)) {
          const blocks = this.blockChildrenListCache.get(blockId);
          if (blocks) {
            console.debug("use cache: blocks for " + blockId);
            return blocks;
          }
        }

        const res = await this.base.blocks.children.list(args);

        // update cache
        this.blockChildrenListCache.set(blockId, res);
        const blockUpdatedAt = this.updatedAtMap.get(blockId);
        if (blockUpdatedAt) {
          this.cacheUpdatedAtMap.set(blockId, blockUpdatedAt);
        }
        for (const block of res.results) {
          this.parentMap.set(block.id, blockId);
        }

        await this.#writeMetaCache();
        await this.#writeCache(`blocks-${blockId}.json`, res);

        return res;
      },
    },
  };

  async loadCache(): Promise<void> {
    if (!this.useFs) return;

    const dir = await fs.promises.readdir(this.baseDir);
    for (const file of dir) {
      if (
        !file.endsWith(".json") ||
        (!file.startsWith("blocks-") && file !== "meta.json")
      )
        continue;

      const data = await this.#readCache(file);
      if (file.startsWith("blocks-")) {
        const id = file.replace("blocks-", "").replace(".json", "");
        this.blockChildrenListCache.set(id, data);
      } else if (file.startsWith("meta")) {
        const { updatedAt, parents } = data;
        this.cacheUpdatedAtMap = new Map(
          Object.entries(updatedAt).map(([k, v]) => [k, new Date(String(v))]),
        );
        this.parentMap = new Map(Object.entries(parents));
      }
    }
  }

  async purgeCache(): Promise<void> {
    this.databaseQueryCache.clear();
    this.blockChildrenListCache.clear();
    this.updatedAtMap.clear();
    this.parentMap.clear();

    if (!this.useFs) return;

    await fs.promises.rm(this.baseDir, { recursive: true });
    await fs.promises.mkdir(this.baseDir, { recursive: true });
  }

  #canUseCache(blockId: string): boolean {
    const parentId = this.#findParent(blockId);
    if (!parentId) return false;

    const updatedAt = this.updatedAtMap.get(parentId);
    const cacheUpdatedAt = this.cacheUpdatedAtMap.get(parentId);
    return (
      !!updatedAt &&
      !!cacheUpdatedAt &&
      updatedAt.getTime() === cacheUpdatedAt.getTime()
    );
  }

  #findParent(id: string): string | undefined {
    let current = id;
    const ids = new Set<string>();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (ids.has(current)) return; // circular reference

      const parent = this.parentMap.get(current);
      if (!parent) return current; // current is root

      ids.add(current);
      current = parent;
    }
  }

  async #writeMetaCache(): Promise<void> {
    if (!this.useFs) return;
    await this.#writeCache(`meta.json`, {
      updatedAt: Object.fromEntries(this.updatedAtMap),
      parents: Object.fromEntries(this.parentMap),
    });
  }

  async #readCache<T = any>(name: string): Promise<T> {
    const data = await fs.promises.readFile(
      path.join(this.baseDir, name),
      "utf-8",
    );
    return JSON.parse(data);
  }

  async #writeCache(name: string, data: any): Promise<void> {
    if (!this.useFs) return;

    console.debug(`write cache: ${name}`);
    await fs.promises.writeFile(
      path.join(this.baseDir, name),
      JSON.stringify(data),
    );
  }

  async #removeCache(name: string): Promise<void> {
    if (!this.useFs) return;
    await fs.promises.rm(path.join(this.baseDir, name));
  }
}
