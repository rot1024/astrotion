import { APIResponseError } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import retry from "async-retry";

type Value<T> = T extends { [K in string | number | symbol]: infer V }
  ? V
  : never;

export type Properties = Value<PageObjectResponse["properties"]>;

export const numberOfRetry = 2;

export async function getSingle<T>(cb: () => Promise<T>): Promise<T> {
  const res = await retry(
    async (bail) => {
      try {
        return await cb();
      } catch (error: unknown) {
        if (error instanceof APIResponseError) {
          if (error.status && error.status >= 400 && error.status < 500) {
            bail(error);
          }
        }
        throw error;
      }
    },
    {
      retries: numberOfRetry,
    },
  );

  return res;
}

type Response<T> = {
  next_cursor: string | null;
  has_more: boolean;
  results: T[];
};

export async function getAll<T>(
  cb: (cursor: string | undefined) => Promise<Response<T>>,
): Promise<T[]> {
  let results: T[] = [];
  let cursor: string | undefined = undefined;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await getSingle(() => cb(cursor));

    results = results.concat(res.results);

    if (!res.has_more) {
      break;
    }

    cursor = res.next_cursor ?? undefined;
  }

  return results;
}
