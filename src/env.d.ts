/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare module "@microflash/rehype-figure" {
  import type { Plugin } from "unified";

  const rehypeFigure: Plugin;
  export default rehypeFigure;
}

declare module "astro-analytics" {
  export function GoogleAnalytics(props: { id?: string }): any;
}
