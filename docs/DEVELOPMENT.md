# Repository development

## Run locally

```sh
npm install
npm run dev
```

Open [the playground](http://127.0.0.1:4173/examples/).

## Publish the website

```sh
npm ci
npm run build:site
```

Upload the contents of `site/` to a static host, or configure its build command
as `npm run build:site` and publish directory as `site`. The site includes
Examples, Code playground and Documentation. Subdirectory hosting works without
route rewrites. Preview the generated site locally at
[the static build](http://127.0.0.1:4173/site/) while the dev server is running.

GitHub Pages is deployed by `.github/workflows/pages.yml` on every push to
`main`. Set **Settings → Pages → Source → GitHub Actions** in the repository.
Website: https://toberpaul.github.io/animations/

- **Examples:** switch between DB React and shadcn/ui, light/dark mode, reduced
  motion, duration, progression gap and overshoot; scrub real animation frames.
- **Code playground:** edit HTML with live preview. Define
  motion in code through attributes/classes or direct factories. Drafts are
  stored locally. Exported HTML references the running library server.

```sh
npm run build           # TypeScript library and CSS → dist/
npm run build:examples  # Both component integrations and playground shell
```

The DB integration uses installed DB component/theme packages. Optional licensed
DB Neo/icon assets require locally configured `ASSET_PASSWORD` and
`ASSET_INIT_VECTOR`; they are not included in this repository. The examples use
fallback icons where applicable. Keep credentials in ignored local environment
files.

Generated builds, dependencies and local visual-check output are ignored by Git.

## AI coding clients

A local read-only MCP server shares the guide, built API declarations, tokens and integration examples with compatible AI clients. See [AI integration setup](docs/AI_INTEGRATION.md). Start with `npm run build`, then configure `node /absolute/path/to/animations/ai/mcp-server.mjs` as a stdio MCP server. Portable integration rules are in `ai/INSTRUCTIONS.md`.

## Local Codex analytics

Run `npm run analytics` and open the printed address. It reads token counts and available five-hour account snapshots from local Codex history for recorded work-package turns. The optional project hook adds local request telemetry and can be trusted under **Settings → Hooks** or with `/hooks`. The [Context Starter](context-starter/README.md) describes the data format.
