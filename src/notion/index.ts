import { Client as RawClient } from "@notionhq/client";

import { DATABASE_ID, NOTION_API_SECRET } from "../constants";

import { CacheClient } from "./cache";
import { Client } from "./client";

const rawClient = new RawClient({
  auth: NOTION_API_SECRET,
});

const defaultClient = new Client(
  new CacheClient({
    base: rawClient,
    databaseId: DATABASE_ID,
    useFs: true,
  }),
  DATABASE_ID,
);

export default defaultClient;
