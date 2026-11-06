# Motion Development Kit (MDK) AI integration

The read-only MDK MCP server gives coding assistants access to the library guide, tokens, API and integration examples.

## Hosted MCP

Connect a client that supports Streamable HTTP to the public endpoint. It requires no API key, sign-in or local checkout.

In Kiro, add only the `motion-library` entry to an existing `mcpServers` object. For a new file, use this complete configuration:

```json
{
  "mcpServers": {
    "motion-library": {
      "url": "https://emjicqiqcpmkindocsnt.supabase.co/functions/v1/mcp"
    }
  }
}
```

Install `@tobiasoberpaul/mdk` in your application when you use its animation API.

## Local stdio

From the repository, run `npm ci` and `npm run build` once. Configure your client to launch:

```text
node /absolute/path/to/animations/ai/mcp-server.mjs
```

Use Node 18 or newer (Node 22 recommended). Paths are resolved relative to the server file, so the client's working directory does not matter. Restart the server after rebuilding the library.

A common MCP configuration shape is:

```json
{
  "mcpServers": {
    "motion-library": {
      "command": "node",
      "args": ["/absolute/path/to/animations/ai/mcp-server.mjs"]
    }
  }
}
```

On Windows use `C:/path/to/animations/ai/mcp-server.mjs`. For Kiro or other clients using `mcpServers`, place the entry in that client's MCP settings. Copilot in VS Code uses its own MCP configuration: put the server entry under `servers`, and add `"type": "stdio"`. Client locations and schemas vary; use the client's MCP settings UI or current documentation. This project does not silently modify any client configuration.

VS Code-style entry:

```json
{
  "servers": {
    "motion-library": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/animations/ai/mcp-server.mjs"]
    }
  }
}
```

## Supabase deployment

The `mcp` Edge Function exposes the same read-only MDK tools, resources and prompt over Streamable HTTP. Its generated bundle contains the public guide, integration rules, CSS tokens, behavior definitions and API declarations. The endpoint is public and needs no database.

With a Supabase project and Node.js 20 or newer, run from the repository root:

```sh
npm ci
npm run build
node scripts/build-mcp-edge.mjs
npx supabase login
npx supabase functions deploy mcp --remote=<project-ref> --use-api --no-verify-jwt
```

Rebuild the bundle before each deployment to keep the served reference in sync with the library.

## What the AI receives

| Capability | Purpose |
| --- | --- |
| `get_motion_reference` | Read guide, tokens, built TypeScript declarations, integration rules or canonical behavior definitions. |
| `create_motion_example` | Generate a minimal disclosure integration for a selected behavior/activation, with optional placement. Returns code text without executing it. |
| `motion://guide` | Public library guide. |
| `motion://tokens` | Actual built motion.css. |
| `motion://instructions` | Portable integration rules. |
| `integrate_motion` prompt | A starting instruction for an AI-assisted component integration. |

The hosted endpoint serves the reference bundled at deployment. The local adapter reads the guide, API declarations, tokens and behavior definitions from the checkout and its build output.

Example request to your AI: “Use the MDK MCP to add an interruptible Grow transition to this existing popover. Preserve its accessibility and positioning.”

## Compatibility and scope

The local adapter uses newline-delimited JSON-RPC over stdio. It supports initialization-based MCP versions 2025-03-26 / 2025-06-18 / 2025-11-25 and discovery-based version 2026-07-28. The Edge Function uses stateless Streamable HTTP and supports initialization-based clients through version 2025-11-25. Both adapters offer read-only tools, resources and prompts.

For clients without MCP, provide `ai/INSTRUCTIONS.md` and `docs/LIBRARY.md` as repository context, or reference them from the client's own instruction file. A model-specific skill or power is not required.

The stdio server runs locally alongside the AI client. Launch it from a built repository checkout using the command above.
