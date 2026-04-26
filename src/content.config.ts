import { databaseCollection, postsCollection } from "@astrotion/astro/content";

import config, { auth, dataSourceId, debug } from "./config";
import { postUrl } from "./utils";

if (!auth || !dataSourceId) {
  throw new Error(
    "NOTION_API_SECRET and DATA_SOURCE_ID environment variables must be set.",
  );
}

const notionOptions = {
  ...config.notiondown,
  auth,
  dataSourceId,
  debug,
};

export const collections = {
  posts: postsCollection({
    ...notionOptions,
    internalLink: (post) => postUrl(post.slug),
  }),
  database: databaseCollection(notionOptions),
};
