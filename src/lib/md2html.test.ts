import { expect, test } from "vitest";

import { markdownToHTML } from "./md2html";

test("markdown strong and em", async () => {
  const md = "**「あああ！」**と__AAA！__と";
  const html = await markdownToHTML(md);
  expect
    .soft(html)
    .toBe(`<p><strong>「あああ！」</strong>と<strong>AAA！</strong>と</p>`);

  const md2 = "_「あああ！」_と*A！*と";
  const html2 = await markdownToHTML(md2);
  expect.soft(html2).toBe(`<p><em>「あああ！」</em>と<em>A！</em>と</p>`);

  const md3 = "**あああ**と";
  const html3 = await markdownToHTML(md3);
  expect.soft(html3).toBe(`<p><strong>あああ</strong>と</p>`);
});
