# Astrotion

Astro + Notion + Blog

NOTE: This is not yet production-ready

## What is different from [astro-notion-blog](https://github.com/otoyo/astro-notion-blog)?

- Stylish theme inspired by [Creek](https://github.com/robertguss/Astro-Theme-Creek)
- 100% TypeScript ready
- Easy to customize
- Simpler implemetation: Notion's rendering is achieved simply by markdown-izing pages
- Notion cache ready: it works on Cloudflare Pages

## Features

- Fetching Notion pages in a database
- Cache Notion pages automatically and reduce build time
- Downloading images in Notion pages automatically
- Basic blocks support
- Code syntax highlighting
- Math equation rendering
- Mermaid rendering
- Automatic OG image generation

## Customization

These files can be customized without concern for conflicts:

- `public/*`
- `src/customization/*`

## How to use

astrotion was inspired by [astro-notion-blog](https://github.com/otoyo/astro-notion-blog). Therefore, the usage is almost the same as astro-notion-blog. Please follow the instructions [here](https://github.com/otoyo/astro-notion-blog).

## TODO

- [ ] Fix links to pages in paragraph blocks
- [ ] Support toggle blocks
- [ ] Support embed and bookmark blocks
- [ ] Tags
- [ ] Search
- [ ] Related Posts
