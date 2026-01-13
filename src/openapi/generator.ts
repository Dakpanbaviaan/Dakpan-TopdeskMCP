/**
 * Generate MCP tools from OpenAPI specification
 */

import { z } from 'zod';
import { TopdeskClient } from '../topdesk/client.js';
import {
  OpenAPIOperation,
  generateOperationId,
} from './loader.js';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: z.ZodObject<z.ZodRawShape>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Generate tool name from operation
 */
function generateToolName(operation: OpenAPIOperation): string {
  const operationId =
    operation.operationId ||
    generateOperationId(operation.method, operation.path);

  // Get primary tag (or 'general' if no tags)
  const tag = operation.tags?.[0]?.toLowerCase() || 'general';

  // Format: topdesk.raw.<tag>.<operationId>
  return `topdesk.raw.${tag}.${operationId}`;
}

/**
 * Generate tool description from operation
 */
function generateToolDescription(operation: OpenAPIOperation): string {
  if (operation.summary) {
    return operation.summary;
  }

  if (operation.description) {
    // Take first sentence
    const firstSentence = operation.description.split('.')[0];
    return firstSentence.trim() + '.';
  }

  return `${operation.method} ${operation.path}`;
}

/**
 * Convert OpenAPI schema to Zod schema (simplified)
 */
function openAPISchemaToZod(schema: unknown): z.ZodTypeAny {
  if (!schema || typeof schema !== 'object') {
    return z.unknown();
  }

  const obj = schema as Record<string, unknown>;

  // Handle type
  const type = obj.type as string | undefined;

  switch (type) {
    case 'string':
      return z.string();

    case 'number':
    case 'integer':
      return z.number();

    case 'boolean':
      return z.boolean();

    case 'array': {
      const items = obj.items;
      const itemSchema = openAPISchemaToZod(items);
      return z.array(itemSchema);
    }

    case 'object': {
      const properties = obj.properties as Record<string, unknown> | undefined;
      const required = (obj.required as string[]) || [];

      if (!properties) {
        return z.record(z.unknown());
      }

      const shape: z.ZodRawShape = {};
      for (const [key, value] of Object.entries(properties)) {
        let fieldSchema = openAPISchemaToZod(value);

        // Make optional if not in required array
        if (!required.includes(key)) {
          fieldSchema = fieldSchema.optional();
        }

        shape[key] = fieldSchema;
      }

      return z.object(shape);
    }

    default:
      return z.unknown();
  }
}

/**
 * Generate input schema for operation
 */
function generateInputSchema(operation: OpenAPIOperation): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};

  // Add path parameters
  const pathParams = operation.parameters?.filter((p) => p.in === 'path') || [];
  for (const param of pathParams) {
    let schema = openAPISchemaToZod(param.schema);
    if (!param.required) {
      schema = schema.optional();
    }
    shape[`path_${param.name}`] = schema;
  }

  // Add query parameters
  const queryParams = operation.parameters?.filter((p) => p.in === 'query') || [];
  if (queryParams.length > 0) {
    const queryShape: z.ZodRawShape = {};
    for (const param of queryParams) {
      let schema = openAPISchemaToZod(param.schema);
      if (!param.required) {
        schema = schema.optional();
      }
      queryShape[param.name] = schema;
    }
    shape.query = z.object(queryShape).optional();
  }

  // Add request body
  if (operation.requestBody) {
    const content = operation.requestBody.content;
    const jsonContent = content['application/json'];

    if (jsonContent) {
      let bodySchema = openAPISchemaToZod(jsonContent.schema);
      if (!operation.requestBody.required) {
        bodySchema = bodySchema.optional();
      }
      shape.body = bodySchema;
    }
  }

  return z.object(shape);
}

/**
 * Generate handler function for operation
 */
function generateHandler(
  client: TopdeskClient,
  operation: OpenAPIOperation
): (args: Record<string, unknown>) => Promise<unknown> {
  return async (args: Record<string, unknown>) => {
    // Build the path with path parameters
    let path = operation.path;
    for (const [key, value] of Object.entries(args)) {
      if (key.startsWith('path_')) {
        const paramName = key.slice(5); // Remove 'path_' prefix
        path = path.replace(`{${paramName}}`, String(value));
      }
    }

    // Extract query parameters
    const query = args.query as Record<string, unknown> | undefined;

    // Extract body
    const body = args.body;

    // Make the request
    const method = operation.method.toLowerCase();
    let response;

    switch (method) {
      case 'get':
        response = await client.get(path, query);
        break;
      case 'post':
        response = await client.post(path, body, { params: query });
        break;
      case 'put':
        response = await client.put(path, body, { params: query });
        break;
      case 'patch':
        response = await client.patch(path, body, { params: query });
        break;
      case 'delete':
        response = await client.delete(path, { params: query });
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    return response;
  };
}

/**
 * Generate MCP tool from OpenAPI operation
 */
export function generateTool(
  client: TopdeskClient,
  operation: OpenAPIOperation
): MCPTool {
  return {
    name: generateToolName(operation),
    description: generateToolDescription(operation),
    inputSchema: generateInputSchema(operation),
    handler: generateHandler(client, operation),
  };
}

/**
 * Generate all MCP tools from OpenAPI operations
 */
export function generateTools(
  client: TopdeskClient,
  operations: OpenAPIOperation[]
): MCPTool[] {
  return operations.map((op) => generateTool(client, op));
}

/**
 * Group tools by tag
 */
export function groupToolsByTag(tools: MCPTool[]): Map<string, MCPTool[]> {
  const groups = new Map<string, MCPTool[]>();

  for (const tool of tools) {
    // Extract tag from tool name (topdesk.raw.<tag>.*)
    const parts = tool.name.split('.');
    const tag = parts[2] || 'general';

    if (!groups.has(tag)) {
      groups.set(tag, []);
    }

    groups.get(tag)!.push(tool);
  }

  return groups;
}
