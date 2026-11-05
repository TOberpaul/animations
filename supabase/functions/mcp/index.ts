import {Server} from 'npm:@modelcontextprotocol/sdk@1.32.2/server/index.js';
import {WebStandardStreamableHTTPServerTransport} from 'npm:@modelcontextprotocol/sdk@1.32.2/server/webStandardStreamableHttp.js';
import {
  CallToolRequestSchema, GetPromptRequestSchema, ListPromptsRequestSchema,
  ListResourcesRequestSchema, ListResourceTemplatesRequestSchema, ListToolsRequestSchema,
  McpError, ReadResourceRequestSchema,
} from 'npm:@modelcontextprotocol/sdk@1.32.2/types.js';
import {capabilities, createMotionMcp, instructions} from './generated/core.mjs';
import data from './generated/data.json' with {type: 'json'};

const references: Record<string, string> = data.references;
const dispatch = createMotionMcp({
  motionBehaviors: data.motionBehaviors,
  read: (path: string) => references[path],
  readApi: () => data.api,
});

async function run(method: string, params?: object) {
  try {
    return await dispatch(method, params);
  } catch (error) {
    if (error instanceof Error && 'code' in error && typeof error.code === 'number') {
      throw new McpError(error.code, error.message);
    }
    throw error;
  }
}

Deno.serve(async (request) => {
  const server = new Server({name: 'motion-library', version: data.version}, {capabilities, instructions});
  server.setRequestHandler(ListToolsRequestSchema, () => run('tools/list'));
  server.setRequestHandler(CallToolRequestSchema, ({params}: {params: object}) => run('tools/call', params));
  server.setRequestHandler(ListResourcesRequestSchema, () => run('resources/list'));
  server.setRequestHandler(ListResourceTemplatesRequestSchema, () => run('resources/templates/list'));
  server.setRequestHandler(ReadResourceRequestSchema, ({params}: {params: object}) => run('resources/read', params));
  server.setRequestHandler(ListPromptsRequestSchema, () => run('prompts/list'));
  server.setRequestHandler(GetPromptRequestSchema, ({params}: {params: object}) => run('prompts/get', params));

  const transport = new WebStandardStreamableHTTPServerTransport({enableJsonResponse: true});
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
});
