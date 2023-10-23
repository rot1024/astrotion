import { Client as RawClient } from "@notionhq/client";

import { DATABASE_ID, NOTION_API_SECRET, DEBUG } from "../constants";

import { CacheClient } from "./cache";
import { Client } from "./client";

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
});

const defaultClient = new Client(cacheClient, DATABASE_ID, !!DEBUG);

let inited = false;

export async function initClient() {
  if (inited) return;
  try {
    inited = true;
    await cacheClient
      .loadCache()
      .then(() => defaultClient.getAllPosts().then(() => undefined));
  } catch (e) {
    inited = false;
    throw e;
  }
}

await initClient();

export default defaultClient;
