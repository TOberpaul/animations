# Motion Development Kit (MDK) AI integration

The read-only MDK MCP server gives coding assistants access to the library guide, tokens, API and integration examples.

## Install the integration skill

`mdk-integration` uses the portable Agent Skills format. Import the
[`skills/mdk-integration` folder](../skills/mdk-integration/) into your
assistant's skill directory. It is also included at
`node_modules/@tobiasoberpaul/mdk/skills/mdk-integration/` in packages that
ship the skill. Prefer the copy that matches the application's MDK version.

- **Codex** reads repository skills from `.agents/skills/`.
- **Kiro** reads workspace skills from `.kiro/skills/` and supports importing the folder.
- **Other Agent Skills clients** can use the same folder in their documented skill location.

Invoke `mdk-integration` for the first task using your client's skill picker
or explicit skill syntax. A client with automatic skill selection can then
recognize it on related tasks. Package installation and MCP connection make
the content available; skill discovery is configured in the assistant.

For clients without skills, paste this into the client's project instructions
(such as `AGENTS.md` where supported) or into the task prompt:

> For MDK work, read and follow `skills/mdk-integration/SKILL.md` from the installed MDK package or the MDK repository. Use the guide, API and tokens that match the installed version. Keep host layout, presence and focus under host control. Use the installed MDK API and verify opening, closing, interruption and reduced motion.

The skill works without MCP using the files in the installed package. A client
with MCP can also read the instructions through `motion://skill`.

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

The `mcp` Edge Function exposes the same read-only MDK tools, resources and prompt over Streamable HTTP. Its generated bundle contains the public guide, integration rules, skill, CSS tokens, behavior definitions and API declarations. The endpoint is public and needs no database.

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
| `get_motion_reference` | Read guide, tokens, built TypeScript declarations, integration rules, skill or canonical behavior definitions. |
| `create_motion_example` | Generate a minimal disclosure integration for a selected behavior/activation, with optional placement. Returns code text without executing it. |
| `motion://guide` | Public library guide. |
| `motion://tokens` | Actual built motion.css. |
| `motion://instructions` | Portable integration rules. |
| `motion://skill` | The portable `mdk-integration` skill. |
| `integrate_motion` prompt | A starting instruction for an AI-assisted component integration. |

The hosted endpoint serves the reference bundled at deployment. The local adapter reads the guide, API declarations, tokens and behavior definitions from the checkout and its build output.

Example request to your AI: “Use the MDK MCP to add an interruptible Grow transition to this existing popover. Preserve its accessibility and positioning.”

## Compatibility and scope

The local adapter uses newline-delimited JSON-RPC over stdio. It supports initialization-based MCP versions 2025-03-26 / 2025-06-18 / 2025-11-25 and discovery-based version 2026-07-28. The Edge Function uses stateless Streamable HTTP and supports initialization-based clients through version 2025-11-25. Both adapters offer read-only tools, resources and prompts.

The stdio server runs locally alongside the AI client. Launch it from a built repository checkout using the command above.
