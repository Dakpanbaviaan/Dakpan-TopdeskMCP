/**
 * OpenAPI specification loader with dereferencing
 */

import { readFile } from 'fs/promises';
import yaml from 'js-yaml';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import { OpenAPIError } from '../utils/errors.js';

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: {
    [path: string]: {
      [method: string]: {
        operationId?: string;
        summary?: string;
        description?: string;
        tags?: string[];
        parameters?: Array<{
          name: string;
          in: 'path' | 'query' | 'header' | 'cookie';
          required?: boolean;
          schema: unknown;
          description?: string;
        }>;
        requestBody?: {
          required?: boolean;
          content: {
            [mediaType: string]: {
              schema: unknown;
            };
          };
        };
        responses: {
          [statusCode: string]: {
            description: string;
            content?: {
              [mediaType: string]: {
                schema: unknown;
              };
            };
          };
        };
      };
    };
  };
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
}

/**
 * Load OpenAPI specification from file
 */
export async function loadOpenAPISpec(
  filePath: string
): Promise<OpenAPISpec> {
  try {
    const content = await readFile(filePath, 'utf-8');

    // Parse based on file extension
    let spec: unknown;
    if (filePath.endsWith('.json')) {
      spec = JSON.parse(content);
    } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      spec = yaml.load(content);
    } else {
      throw new OpenAPIError(
        `Unsupported file format. Expected .json, .yaml, or .yml`
      );
    }

    // Dereference $ref pointers
    const dereferencedSpec = await $RefParser.dereference(spec as object);

    return dereferencedSpec as OpenAPISpec;
  } catch (error) {
    if (error instanceof OpenAPIError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Failed to load OpenAPI spec';
    throw new OpenAPIError(`Failed to load OpenAPI spec: ${message}`);
  }
}

/**
 * Validate OpenAPI specification
 */
export function validateOpenAPISpec(spec: unknown): spec is OpenAPISpec {
  if (!spec || typeof spec !== 'object') {
    return false;
  }

  const obj = spec as Record<string, unknown>;

  // Check required fields
  if (!obj.openapi || typeof obj.openapi !== 'string') {
    return false;
  }

  if (!obj.info || typeof obj.info !== 'object') {
    return false;
  }

  if (!obj.paths || typeof obj.paths !== 'object') {
    return false;
  }

  return true;
}

/**
 * Extract all operations from OpenAPI spec
 */
export interface OpenAPIOperation {
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Array<{
    name: string;
    in: 'path' | 'query' | 'header' | 'cookie';
    required?: boolean;
    schema: unknown;
    description?: string;
  }>;
  requestBody?: {
    required?: boolean;
    content: {
      [mediaType: string]: {
        schema: unknown;
      };
    };
  };
  responses: {
    [statusCode: string]: {
      description: string;
      content?: {
        [mediaType: string]: {
          schema: unknown;
        };
      };
    };
  };
}

export function extractOperations(spec: OpenAPISpec): OpenAPIOperation[] {
  const operations: OpenAPIOperation[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

    for (const method of methods) {
      const operation = pathItem[method];
      if (operation) {
        operations.push({
          method: method.toUpperCase(),
          path,
          operationId: operation.operationId,
          summary: operation.summary,
          description: operation.description,
          tags: operation.tags,
          parameters: operation.parameters,
          requestBody: operation.requestBody,
          responses: operation.responses,
        });
      }
    }
  }

  return operations;
}

/**
 * Generate operation ID if not provided
 */
export function generateOperationId(method: string, path: string): string {
  // Convert path to camelCase
  // Example: /api/incidents/{id} -> getApiIncidentsById
  const parts = path
    .split('/')
    .filter((p) => p.length > 0)
    .map((part) => {
      // Handle path parameters
      if (part.startsWith('{') && part.endsWith('}')) {
        return 'By' + capitalize(part.slice(1, -1));
      }
      return capitalize(part);
    });

  return method.toLowerCase() + parts.join('');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
