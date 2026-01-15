#!/usr/bin/env node

/**
 * TOPdesk MCP Server
 * Production-ready MCP server for TOPdesk API integration
 */

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createTopdeskClientFromEnv } from './topdesk/client.js';
import { highLevelTools } from './tools/highlevel.js';
import {
  loadOpenAPISpec,
  extractOperations,
  validateOpenAPISpec,
} from './openapi/loader.js';
import { generateTools } from './openapi/generator.js';
import { manualEndpointRegistry } from './openapi/manualRegistry.js';
import { getErrorMessage } from './utils/errors.js';

const DEBUG = process.env.DEBUG === 'true';

/**
 * Initialize the TOPdesk MCP Server
 */
async function initializeServer() {
  // Create TOPdesk client
  let client;
  try {
    client = createTopdeskClientFromEnv();
  } catch (error) {
    console.error('Failed to initialize TOPdesk client:', getErrorMessage(error));
    process.exit(1);
  }

  // Load raw tools from OpenAPI spec or manual registry
  let rawTools: ReturnType<typeof generateTools> = [];

  const openApiPath = process.env.TOPDESK_OPENAPI_PATH;
  if (openApiPath) {
    try {
      if (DEBUG) {
        console.error(`[TOPdesk] Loading OpenAPI spec from: ${openApiPath}`);
      }

      const spec = await loadOpenAPISpec(openApiPath);

      if (!validateOpenAPISpec(spec)) {
        throw new Error('Invalid OpenAPI specification');
      }

      const operations = extractOperations(spec);
      rawTools = generateTools(client, operations);

      if (DEBUG) {
        console.error(
          `[TOPdesk] Loaded ${rawTools.length} raw tools from OpenAPI spec`
        );
      }
    } catch (error) {
      console.error(
        'Failed to load OpenAPI spec, falling back to manual registry:',
        getErrorMessage(error)
      );
      rawTools = generateTools(client, manualEndpointRegistry);
    }
  } else {
    if (DEBUG) {
      console.error('[TOPdesk] Using manual endpoint registry (no OpenAPI spec provided)');
    }
    rawTools = generateTools(client, manualEndpointRegistry);
  }

  // Create MCP server
  const server = new Server(
    {
      name: 'topdesk-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Combine high-level and raw tools
  const allTools = [
    ...highLevelTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      handler: async (args: Record<string, unknown>) => tool.handler(client, args),
    })),
    ...rawTools,
  ];

  if (DEBUG) {
    console.error(`[TOPdesk] Registered ${allTools.length} total tools:`);
    console.error(
      `  - ${highLevelTools.length} high-level curated tools`
    );
    console.error(`  - ${rawTools.length} raw generated tools`);
  }

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: zodToJsonSchema(tool.inputSchema),
      })),
    };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Find the tool
    const tool = allTools.find((t) => t.name === name);

    if (!tool) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: Unknown tool '${name}'`,
          },
        ],
        isError: true,
      };
    }

    try {
      // Validate and parse arguments
      const parsedArgs = tool.inputSchema.parse(args || {});

      // Execute tool
      const result = await tool.handler(parsedArgs);

      // Return result
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      if (DEBUG) {
        console.error(`[TOPdesk] Tool '${name}' failed:`, error);
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Error executing tool '${name}': ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Convert Zod schema to JSON Schema
 */
function zodToJsonSchema(schema: any): any {
  // This is a simplified conversion
  // For production, consider using a library like zod-to-json-schema

  const shape = schema._def?.shape?.();
  if (!shape) {
    return {
      type: 'object',
      properties: {},
    };
  }

  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const fieldSchema = value as any;

    // Check if field is optional
    const isOptional = fieldSchema._def?.typeName === 'ZodOptional';
    const innerSchema = isOptional ? fieldSchema._def.innerType : fieldSchema;

    if (!isOptional) {
      required.push(key);
    }

    // Get the type
    const typeName = innerSchema._def?.typeName;
    let jsonType: any = { type: 'string' };

    switch (typeName) {
      case 'ZodString':
        jsonType = { type: 'string' };
        break;
      case 'ZodNumber':
        jsonType = { type: 'number' };
        break;
      case 'ZodBoolean':
        jsonType = { type: 'boolean' };
        break;
      case 'ZodArray':
        jsonType = { type: 'array', items: { type: 'string' } };
        break;
      case 'ZodObject':
        jsonType = { type: 'object' };
        break;
      case 'ZodRecord':
        jsonType = { type: 'object', additionalProperties: true };
        break;
      case 'ZodEnum':
        const values = innerSchema._def?.values || [];
        jsonType = { type: 'string', enum: values };
        break;
      default:
        jsonType = { type: 'string' };
    }

    // Add description
    const description = innerSchema._def?.description;
    if (description) {
      jsonType.description = description;
    }

    // Add default value
    const defaultValue = innerSchema._def?.defaultValue;
    if (defaultValue !== undefined) {
      jsonType.default = defaultValue();
    }

    properties[key] = jsonType;
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

/**
 * Start the server
 */
async function main() {
  try {
    const server = await initializeServer();

    const transport = new StdioServerTransport();
    await server.connect(transport);

    if (DEBUG) {
      console.error('[TOPdesk] MCP Server started successfully');
    }
  } catch (error) {
    console.error('Fatal error starting server:', getErrorMessage(error));
    process.exit(1);
  }
}

// Start the server
main();
