import { Client, type Options as ClientOptions, type Database } from "notiondown";

export type DatabaseLoaderOptions = ClientOptions & {
  /**
   * Cache directory for Notion API responses. Should match the
   * `cacheDir` used by `notiondownLoader` so the two loaders share
   * cache hits. Defaults to `./node_modules/.cache/notiondown`.
   */
  cacheDir?: string;
};

type StoreEntry = {
  id: string;
  data: Record<string, unknown>;
  digest?: string | number;
};

type AstroDataStore = {
  clear: () => void;
  set: (entry: StoreEntry) => boolean;
  get?: (id: string) => StoreEntry | undefined;
};

type LoaderContext = {
  store: AstroDataStore;
  logger: { info: (msg: string) => void };
  generateDigest?: (data: string | Record<string, unknown>) => string;
  parseData?: <T extends Record<string, unknown>>(input: {
    id: string;
    data: T;
    filePath?: string;
  }) => Promise<T>;
};

export type AstroLoader = {
  name: string;
  load: (context: LoaderContext) => Promise<void>;
};

const DEFAULT_CACHE_DIR = "./node_modules/.cache/notiondown";
const ENTRY_ID = "default";

/**
 * Astro Content Layer loader that materializes a Notion database's metadata
 * (title / description / icon / cover) as a single content entry, so layouts
 * and feeds can read it via `getEntry("<collection>", "default")`.
 */
export function databaseLoader(options: DatabaseLoaderOptions): AstroLoader {
  const { cacheDir = DEFAULT_CACHE_DIR, ...rest } = options;
  const clientOptions: ClientOptions = { ...rest, cacheDir };

  return {
    name: "notiondown-database",
    load: async ({ store, logger, parseData }) => {
      const client = new Client(clientOptions);
      await client.loadCache();
      logger.info("fetching database metadata from Notion");
      const db: Database = await client.getDatabase();

      const raw = {
        title: db.title,
        description: db.description,
        icon: db.icon,
        cover: db.cover,
      };
      const data = parseData
        ? await parseData({ id: ENTRY_ID, data: raw })
        : raw;
      store.set({ id: ENTRY_ID, data });
    },
  };
}

export const DATABASE_ENTRY_ID = ENTRY_ID;
