# Astrotion

Astro + Notion + Blog

![Screenshot](docs/screenshot.webp)

## What is different from [astro-notion-blog](https://github.com/otoyo/astro-notion-blog)?

- Stylish theme inspired by [Creek](https://github.com/robertguss/Astro-Theme-Creek)
- 100% TypeScript ready
- Easy to customize
- Simpler implemetation: Notion's rendering is achieved simply by markdown-izing pages
- Notion cache ready: it works on Cloudflare Pages
- Support Astro v5 and TailwindCSS v4

💡 Powered by [notiondown](https://github.com/rot1024/notiondown) and
[`@astrotion/loader`](./packages/astro-loader) (Astro Content Layer loader,
also publishable as a standalone npm package).

## Features

- Fetching Notion pages in a database
- Cache Notion pages automatically and reduce build time
- Downloading images in Notion pages automatically
- Basic blocks support
- Code syntax highlighting
- Math equation rendering
- Mermaid diagram rendering
- Automatic OG image generation

## Repository Structure

This repository is an npm workspaces monorepo:

- `./` — the Astro template (root app)
- `packages/astro-loader/` — `@astrotion/loader`, the standalone Astro
  Content Layer loader for Notion. The template consumes it via the
  workspace; you can also use it independently in your own Astro project.

See [packages/astro-loader/README.md](./packages/astro-loader/README.md) for
loader-only usage.

## Customization

These files can be customized without concern for conflicts:

- `public/*`
- `src/customization/*`

## Showcase

- [Re:Earth Engineering](https://reearth.engineering)

## Getting Started

### 1. Use this template

Click the "Use this template" button on GitHub to create your own repository.

### 2. Set up Notion

1. Duplicate [this blog template](https://rot1024.notion.site/2f4e5259d70480dab0a0d777e7afe553?v=2f4e5259d704800999db000c50218134) to your Notion workspace
2. Customize the icon, title, and description as you like
3. Note the `DATABASE_ID` from your page URL: `https://notion.so/your-account/<DATABASE_ID>?v=xxxx`

### 3. Create a Notion Integration

1. Go to [My Integrations](https://www.notion.so/my-integrations) and create a new integration
2. Copy the "Internal Integration Token" as `NOTION_API_SECRET`
3. Go back to your Notion database page, click "..." → "Connections" → "Connect to" and select your integration

### 4. Deploy to Cloudflare Workers

1. Update `name` in `wrangler.toml` to your project name
2. Create a `.env` file with the following variables:
   ```
   NOTION_API_SECRET=your_notion_integration_token
   DATA_SOURCE_ID=your_notion_database_id
   ```
3. Install dependencies and deploy: `npm install && npx wrangler deploy`

### 5. Deploy to Cloudflare Pages (Alternative)

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/) and create a new project
2. Connect your GitHub repository
3. Set the following environment variables:
   - `NOTION_API_SECRET`: Your Notion integration token
   - `DATA_SOURCE_ID`: Your Notion database ID
4. Click "Save and Deploy"

### 6. Set up automatic deployments (Optional)

After publishing a new post in Notion, you need to trigger a new deployment. You can use the included GitHub Actions workflows:

**For Cloudflare Workers:**

Set the following secrets in your GitHub repository settings:
- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
- `NOTION_API_SECRET`: Your Notion integration token
- `DATA_SOURCE_ID`: Your Notion database ID

Then run the "Deploy (Cloudflare Workers)" workflow manually or set up a schedule.

**For Cloudflare Pages:**

Set up a deploy hook in Cloudflare Pages dashboard, then add the URL as `DEPLOY_HOOK_URL` secret in your GitHub repository. Run the "Deploy (Webhook)" workflow manually or set up a schedule.

## TODO

- [ ] Support embed and bookmark blocks
- [ ] Search
- [ ] Related Posts
- [ ] i18n support
