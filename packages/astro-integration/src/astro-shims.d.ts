// Ambient declarations for Astro virtual modules. They are only available
// when the package is consumed inside an Astro project; the shims below
// keep the package's own TypeScript build happy.

declare module "astro:assets" {
  import type { ImageMetadata } from "astro";
  export function getImage(options: {
    src: string | ImageMetadata;
    widths?: number[];
    densities?: Array<number | `${number}x`>;
    format?: string;
    sizes?: string;
    [key: string]: unknown;
  }): Promise<{
    src: string;
    attributes: Record<string, string | number | undefined>;
    srcSet: { values: Array<{ url: string; descriptor?: string }>; attribute: string };
    rawOptions: unknown;
    options: unknown;
  }>;
}

declare module "astro:content" {
  export function defineCollection(config: unknown): unknown;
  export const z: typeof import("astro/zod").z;
  export type CollectionEntry<_T extends string = string> = {
    id: string;
    data: Record<string, unknown> & {
      date: string;
      tags: Array<{ id: string; name: string; color?: string }>;
    };
  };
  export function getEntry(
    collection: string,
    id: string,
  ): Promise<CollectionEntry | undefined>;
}
