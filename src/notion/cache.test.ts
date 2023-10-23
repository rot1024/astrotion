import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type {
  ListBlockChildrenResponse,
  QueryDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { expect, test, vi } from "vitest";

import { CacheClient } from "./cache";

test("CacheClient", async () => {
  // 1. no cache
  const tmp = await tmpdir();
  const base1 = baseClient();
  const client1 = new CacheClient({
    base: base1,
    databaseId: "databaseId",
    useFs: true,
    baseDir: tmp,
  });
  await client1.loadCache();

  // get pages
  const db1_1 = await client1.databases.query({
    database_id: "databaseId",
  });
  expect(db1_1).toEqual(databaseQueryRes());

  const meta1_1 = JSON.parse(
    await fs.promises.readFile(path.join(tmp, "meta.json"), "utf-8"),
  );
  expect(meta1_1).toEqual({
    updatedAt: {
      pageId: "2021-01-01T00:00:00.000Z",
    },
    parents: {},
  });
  expect(base1.databases.query).toHaveBeenCalledTimes(1);

  // get blocks
  const blocks1_1 = await client1.blocks.children.list({
    block_id: "pageId",
  });
  expect(blocks1_1).toEqual(blockQueryRes());
  expect(base1.blocks.children.list).toHaveBeenCalledTimes(1);

  const meta1_2 = JSON.parse(
    await fs.promises.readFile(path.join(tmp, "meta.json"), "utf-8"),
  );
  expect(meta1_2).toEqual({
    updatedAt: {
      pageId: "2021-01-01T00:00:00.000Z",
    },
    parents: {
      blockId: "pageId",
    },
  });

  const cache1_1 = JSON.parse(
    await fs.promises.readFile(path.join(tmp, "blocks-pageId.json"), "utf-8"),
  );
  expect(cache1_1).toEqual(blockQueryRes());

  const cacheStat1_1 = await fs.promises.stat(
    path.join(tmp, "blocks-pageId.json"),
  );

  // get another blocks
  const blocks1_2 = await client1.blocks.children.list({
    block_id: "blockId",
  });
  expect(blocks1_2).toEqual(blockQueryRes("blockId2"));
  expect(base1.blocks.children.list).toHaveBeenCalledTimes(2);

  const meta1_3 = JSON.parse(
    await fs.promises.readFile(path.join(tmp, "meta.json"), "utf-8"),
  );
  expect(meta1_3).toEqual({
    updatedAt: {
      pageId: "2021-01-01T00:00:00.000Z",
    },
    parents: {
      blockId: "pageId",
      blockId2: "blockId",
    },
  });

  const cache1_2 = JSON.parse(
    await fs.promises.readFile(path.join(tmp, "blocks-blockId.json"), "utf-8"),
  );
  expect(cache1_2).toEqual(blockQueryRes("blockId2"));

  const cacheStat1_2 = await fs.promises.stat(
    path.join(tmp, "blocks-blockId.json"),
  );

  // 2. cache exists
  const base2 = base1;
  const client2 = client1;
  base2.databases.query.mockReset();
  base2.blocks.children.list.mockReset();

  // get pages again
  const db2 = await client2.databases.query({
    database_id: "databaseId",
  });
  expect(db2).toEqual(databaseQueryRes());
  // cache should be used
  expect(base2.databases.query).toHaveBeenCalledTimes(0);

  // get blocks again 1
  const blocks2_1 = await client1.blocks.children.list({
    block_id: "pageId",
  });

  expect(blocks2_1).toEqual(blockQueryRes());
  const cacheStat2_1 = await fs.promises.stat(
    path.join(tmp, "blocks-pageId.json"),
  );
  // cache file should not be updated
  expect(cacheStat2_1.mtime).toEqual(cacheStat1_1.mtime);
  // cache should be used
  expect(base2.blocks.children.list).toHaveBeenCalledTimes(0);

  // get block again 2
  const blocks2_2 = await client1.blocks.children.list({
    block_id: "blockId",
  });

  expect(blocks2_2).toEqual(blockQueryRes("blockId2"));
  const cacheStat2_2 = await fs.promises.stat(
    path.join(tmp, "blocks-blockId.json"),
  );
  // cache file should not be updated
  expect(cacheStat2_2.mtime).toEqual(cacheStat1_2.mtime);
  // cache should be used
  expect(base2.blocks.children.list).toHaveBeenCalledTimes(0);

  // 3. renew client and load cache
  const base3 = baseClient();
  const client3 = new CacheClient({
    base: base3,
    databaseId: "databaseId",
    useFs: true,
    baseDir: tmp,
  });
  await client3.loadCache();

  // get pages again
  const db3 = await client3.databases.query({
    database_id: "databaseId",
  });
  expect(db3).toEqual(databaseQueryRes());
  expect(base3.databases.query).toHaveBeenCalledTimes(1);

  // get blocks again 1
  const blocks3_1 = await client3.blocks.children.list({
    block_id: "pageId",
  });
  expect(blocks3_1).toEqual(blockQueryRes());
  // cache should be used
  expect(base3.blocks.children.list).toHaveBeenCalledTimes(0); // not called

  // get blocks again 2
  const blocks3_2 = await client3.blocks.children.list({
    block_id: "blockId",
  });
  expect(blocks3_2).toEqual(blockQueryRes("blockId2"));
  // cache should be used
  expect(base3.blocks.children.list).toHaveBeenCalledTimes(0); // not called

  // 4. renew client and load cache but cache is expired
  const newLastEditedTime = "2021-01-01T00:00:01.000Z";
  const base4 = baseClient(newLastEditedTime);
  const client4 = new CacheClient({
    base: base4,
    databaseId: "databaseId",
    useFs: true,
    baseDir: tmp,
  });

  const db4 = await client4.databases.query({
    database_id: "databaseId",
  });
  expect(db4).toEqual(databaseQueryRes(newLastEditedTime));
  expect(base4.databases.query).toHaveBeenCalledTimes(1);

  const blocks4_1 = await client4.blocks.children.list({
    block_id: "pageId",
  });
  expect(blocks4_1).toEqual(blockQueryRes("blockId", newLastEditedTime));
  expect(base4.blocks.children.list).toHaveBeenCalledTimes(1); // called

  const blocks4_2 = await client4.blocks.children.list({
    block_id: "blockId",
  });
  expect(blocks4_2).toEqual(blockQueryRes("blockId2", newLastEditedTime));
  expect(base4.blocks.children.list).toHaveBeenCalledTimes(2); // called
});

function tmpdir(): Promise<string> {
  return fs.promises.mkdtemp(path.join(os.tmpdir(), "astrotion-test-"));
}

const defaultLastEditedTime = "2021-01-01T00:00:00.000Z";

const databaseQueryRes = (
  last_edited_time: string = defaultLastEditedTime,
): QueryDatabaseResponse => ({
  object: "list",
  next_cursor: null,
  has_more: false,
  type: "page_or_database",
  page_or_database: {},
  results: [
    {
      archived: false,
      cover: null,
      icon: null,
      id: "pageId",
      object: "page",
      last_edited_time,
    },
  ],
});

const blockQueryRes = (
  id: string = "blockId",
  last_edited_time: string = defaultLastEditedTime,
): ListBlockChildrenResponse => ({
  object: "list",
  next_cursor: null,
  has_more: false,
  type: "block",
  block: {},
  results: [
    {
      id,
      type: "paragraph",
      created_by: {
        object: "user",
        id: "userId",
      },
      last_edited_by: {
        object: "user",
        id: "userId",
      },
      object: "block",
      created_time: "2021-01-01T00:00:00.000Z",
      last_edited_time,
      has_children: true,
      archived: false,
      parent: {
        type: "page_id",
        page_id: "pageId",
      },
      paragraph: {
        color: "default",
        rich_text: [
          {
            type: "text",
            text: {
              content: "Hello",
              link: null,
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "Hello",
            href: null,
          },
        ],
      },
    },
  ],
});

const baseClient = (lastEditedTime?: string) => ({
  databases: {
    query: vi.fn(async () => {
      return databaseQueryRes(lastEditedTime);
    }),
  },
  blocks: {
    children: {
      list: vi.fn(async (args) => {
        return blockQueryRes(
          args.block_id === "blockId" ? "blockId2" : "blockId",
          lastEditedTime,
        );
      }),
    },
  },
});
