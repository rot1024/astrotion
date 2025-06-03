/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare module "astro-analytics" {
  export function GoogleAnalytics(props: { id?: string }): any;
}
