import { expect, test } from "vitest";

import { getUrl, postUrl } from "./utils";

test("getUrl", () => {
  expect.soft(getUrl("aaa.webp")).toBe("aaa.webp");
  expect.soft(getUrl("aaa")).toBe("aaa/");
});

test("postUrl", () => {
  expect.soft(postUrl("aaa.webp")).toBe("/posts/aaa.webp");
  expect.soft(postUrl("aaa")).toBe("/posts/aaa/");
});
