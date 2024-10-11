import { Client as RawClient } from "@notionhq/client";

import {
  DATABASE_ID,
  NOTION_API_SECRET,
  DEBUG,
  CACHE_DIR_NOTION,
} from "../constants";

import { Client } from "./astrotion";
import { CacheClient } from "./notion/cache";

if (!NOTION_API_SECRET || !DATABASE_ID) {
  throw new Error("NOTION_API_SECRET and DATABASE_ID must be set");
}

const rawClient = new RawClient({
  auth: NOTION_API_SECRET,
});

const cacheClient = new CacheClient({
  base: rawClient,
  databaseId: DATABASE_ID,
  useFs: true,
  debug: !!DEBUG,
  baseDir: CACHE_DIR_NOTION,
});

const defaultClient = new Client(cacheClient, DATABASE_ID, !!DEBUG);

let inited = false;

export async function initClient() {
  if (inited) return;
  try {
    inited = true;
    await cacheClient
      .loadCache()
      .then(() =>
        Promise.all([
          defaultClient.getDatabase().then(() => undefined),
          defaultClient.getAllPosts().then(() => undefined),
        ]),
      );
  } catch (e) {
    inited = false;
    throw e;
  }
}

await initClient();

export default defaultClient;
