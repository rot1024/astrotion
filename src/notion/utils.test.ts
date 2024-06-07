import type {
  ImageBlockObjectResponse,
  ParagraphBlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { expect, test } from "vitest";

import { expiresIn, expiresInForObjects } from "./utils";

test("expiresIn", () => {
  const exp1 = new Date("2020-01-01");
  const exp2 = new Date("2021-01-01");
  const block = (exp: Date): ImageBlockObjectResponse => ({
    id: "id",
    created_time: "",
    created_by: {
      object: "user",
      id: "id",
    },
    last_edited_time: "",
    last_edited_by: {
      object: "user",
      id: "id",
    },
    object: "block",
    has_children: false,
    archived: false,
    parent: {
      type: "block_id",
      block_id: "block_id",
    },
    type: "image",
    image: {
      type: "file",
      caption: [],
      file: {
        url: "url",
        expiry_time: exp.toISOString(),
      },
    },
    in_trash: false,
  });

  expect(
    expiresIn({
      id: "id",
      created_time: "",
      created_by: {
        object: "user",
        id: "id",
      },
      last_edited_time: "",
      last_edited_by: {
        object: "user",
        id: "id",
      },
      object: "block",
      has_children: false,
      archived: false,
      parent: {
        type: "block_id",
        block_id: "block_id",
      },
      type: "paragraph",
      paragraph: {
        color: "default",
        rich_text: [],
      },
      in_trash: false,
    } satisfies ParagraphBlockObjectResponse),
  ).toBeUndefined();

  expect(expiresIn(block(exp1))).toEqual(exp1);
  expect(expiresIn(block(exp2))).toEqual(exp2);
  expect(expiresInForObjects([block(exp1), block(exp2)])).toEqual(exp1);
});
