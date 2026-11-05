# AI integration

The library includes a local, read-only MCP server. Use it with an AI client that supports local stdio MCP servers. No model provider, API key, remote service, or runtime framework dependency is required. Each client controls its own approval and tool-use behavior.

## Setup

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

## What the AI receives

| Capability | Purpose |
| --- | --- |
| `get_motion_reference` | Read guide, tokens, built TypeScript declarations, integration rules or canonical behavior definitions. |
| `create_motion_example` | Generate a minimal disclosure integration for a selected behavior/activation, with optional placement. Returns code text without executing it. |
| `motion://guide` | Public library guide. |
| `motion://tokens` | Actual built motion.css. |
| `motion://instructions` | Portable integration rules. |
| `integrate_motion` prompt | A starting instruction for an AI-assisted component integration. |

Guide, API, token and behavior responses are loaded from this checkout's documentation/build output. There is no separately maintained copy of the token values or API signatures. Rebuild after library API changes.

Example request to your AI: “Use the Motion Library MCP to add an interruptible Grow transition to this existing popover. Preserve its accessibility and positioning.”

## Compatibility and scope

The adapter uses newline-delimited JSON-RPC over stdio. It supports initialization-based MCP versions 2025-03-26 / 2025-06-18 / 2025-11-25 and discovery-based version 2026-07-28. It offers read-only tools/resources/prompts, not remote HTTP hosting or resource subscriptions. Compatibility is conditional on the client's MCP implementation; it has not been certified in every AI product.

For clients without MCP, provide `ai/INSTRUCTIONS.md` and `docs/LIBRARY.md` as repository context, or reference them from the client's own instruction file. A model-specific skill or power is not required.

The stdio server runs locally alongside the AI client. Launch it from a built repository checkout using the command above.
