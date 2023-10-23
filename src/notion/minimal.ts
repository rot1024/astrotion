import type {
  GetDatabaseParameters,
  GetDatabaseResponse,
  ListBlockChildrenParameters,
  ListBlockChildrenResponse,
  QueryDatabaseParameters,
  QueryDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { NotionToMarkdown } from "notion-to-md";
import type { NotionToMarkdownOptions } from "notion-to-md/build/types";

export type MinimalNotionClient = {
  blocks: {
    children: {
      list(
        args: ListBlockChildrenParameters,
      ): Promise<ListBlockChildrenResponse>;
    };
  };
  databases: {
    query(args: QueryDatabaseParameters): Promise<QueryDatabaseResponse>;
    retrieve: (args: GetDatabaseParameters) => Promise<GetDatabaseResponse>;
  };
};

export function newNotionToMarkdown(
  client: MinimalNotionClient,
  options?: Omit<NotionToMarkdownOptions, "notionClient">,
): NotionToMarkdown {
  return new NotionToMarkdown({
    ...options,
    notionClient: client as any,
  });
}
