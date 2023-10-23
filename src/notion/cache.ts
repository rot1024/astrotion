import fs from "node:fs";
import path from "node:path";

import type {
  GetDatabaseResponse,
  ListBlockChildrenResponse,
  QueryDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";

import type { MinimalNotionClient } from "./minimal";
import { expiresInForObjects, getLastEditedTime } from "./utils";

const defaultBaseDir = "./.astro/.astrotion/notion-cache";

export type Options = {
  base: MinimalNotionClient;
  databaseId: string;
  useFs?: boolean;
  baseDir?: string;
  debug?: boolean;
};

export class CacheClient {
  base: MinimalNotionClient;
  databaseId: string;
  useFs: boolean;
  baseDir: string;
  debug: boolean;
  blockChildrenListCache: Map<string, ListBlockChildrenResponse> = new Map();
  databaseCache: Map<string, GetDatabaseResponse> = new Map();
  databaseQueryCache: Map<string, QueryDatabaseResponse> = new Map();
  updatedAtMap: Map<string, Date> = new Map();
  cacheUpdatedAtMap: Map<string, Date> = new Map();
  parentMap: Map<string, string> = new Map();

  constructor(options: Options) {
    this.base = options.base;
    this.databaseId = options.databaseId;
    this.useFs = options?.useFs ?? false;
    this.baseDir = options?.baseDir ?? defaultBaseDir;
    this.debug = options?.debug ?? false;
    if (this.useFs) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  databases: MinimalNotionClient["databases"] = {
    query: async (args) => {
      const databaseId = args.database_id;

      const cache = this.databaseQueryCache.get(databaseId);
      if (cache) {
        this.#log("use cache: database query for " + databaseId);
        return cache;
      }

      this.#log("query databases " + databaseId);
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
    retrieve: async (args) => {
      const databaseId = args.database_id;

      const cache = this.databaseCache.get(databaseId);
      if (cache) {
        this.#log("use cache: database for " + databaseId);
        return cache;
      }

      this.#log("get database " + databaseId);
      const res = await this.base.databases.retrieve(args);
      this.databaseCache.set(databaseId, res);
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
            this.#log("use cache: blocks for " + blockId);
            return blocks;
          }
        }

        this.#log("load blocks " + blockId);
        const res = await this.base.blocks.children.list(args);

        // update cache
        this.blockChildrenListCache.set(blockId, res);
        const blockUpdatedAt = this.updatedAtMap.get(blockId);
        if (blockUpdatedAt) {
          this.cacheUpdatedAtMap.set(blockId, blockUpdatedAt);
        }

        for (const block of res.results) {
          if ("has_children" in block && block.has_children) {
            this.parentMap.set(block.id, blockId);
          }
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
    this.databaseCache.clear();
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

    // An error may occur if only some of the images have been downloaded, but when such a situation does not occur,
    // it is usually not necessary to check the expiration date of the image URL.

    // const pageExp = this.#pageCacheExpirationTime(parentId);

    const canUse =
      !!updatedAt &&
      !!cacheUpdatedAt &&
      updatedAt.getTime() === cacheUpdatedAt.getTime(); // &&
    // (!pageExp || pageExp.getTime() > Date.now());

    this.#log(
      "validate cache:",
      blockId,
      canUse ? "OK" : "EXPIRED",
      "let:", // Last edited time
      updatedAt,
      "cache:",
      cacheUpdatedAt,
      // "exp:",
      // pageExp,
    );

    return canUse;
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
    this.#log("read cache: " + name);
    const data = await fs.promises.readFile(
      path.join(this.baseDir, name),
      "utf-8",
    );
    return JSON.parse(data);
  }

  async #writeCache(name: string, data: any): Promise<void> {
    if (!this.useFs) return;

    this.#log(`write cache: ${name}`);
    await fs.promises.writeFile(
      path.join(this.baseDir, name),
      JSON.stringify(data),
    );
  }

  allChildrenIds(parent: string): string[] {
    const ids: string[] = [];
    for (const [c, p] of this.parentMap) {
      if (p === parent) {
        ids.push(c, ...this.allChildrenIds(c));
      }
    }
    return ids;
  }

  #pageCacheExpirationTime(pageId: string): Date | undefined {
    const allPageAndBlocks = [pageId, ...this.allChildrenIds(pageId)];
    const allCache = allPageAndBlocks
      .map((id) => this.blockChildrenListCache.get(id))
      .flatMap((res) => res?.results ?? []);
    return expiresInForObjects(allCache);
  }

  #log(...args: any[]) {
    if (this.debug) console.debug("CacheClient:", ...args);
  }
}
