import type { Transformer } from "@remark-embedder/core";
import codeSandboxTransformer from "@remark-embedder/transformer-codesandbox";
import oembedTransformer from "@remark-embedder/transformer-oembed";

const youtube: Transformer = {
  name: "youtube",
  shouldTransform(url: string) {
    return new URL(url).hostname === "www.youtube.com";
  },
  getHTML(url: string) {
    const u = new URL(url);
    const id = u.searchParams.get("v") || u.pathname.split("/").pop();
    const iframeSrc = new URL("https://www.youtube.com/embed/" + id);
    // iframeSrc.searchParams.set("origin", "orign");
    return `<iframe type="text/html" width="640" height="360" src="${iframeSrc.toString()}" frameborder="0" class="youtube"></iframe>`;
  },
};

export const transformers: Transformer<any>[] = [
  youtube,
  (codeSandboxTransformer as any).default as typeof codeSandboxTransformer,
  (oembedTransformer as any).default as typeof oembedTransformer,
];
