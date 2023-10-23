export function postUrl(slug: string, base?: string): string {
  if (base) {
    return new URL(postUrl(slug), base).toString();
  }
  return `/posts/${slug}`;
}
