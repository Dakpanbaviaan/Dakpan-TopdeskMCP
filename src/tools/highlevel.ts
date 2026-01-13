/**
 * High-level curated MCP tools for TOPdesk
 * These tools provide clean, user-friendly interfaces for common operations
 */

import { z } from 'zod';
import { TopdeskClient } from '../topdesk/client.js';
import { buildPaginatedResponse, PaginatedResponse } from '../utils/pagination.js';

// ============================================================================
// TICKETS
// ============================================================================

export const ticketsMyListSchema = z.object({
  scope: z
    .enum(['assigned_to_me', 'created_by_me', 'operator_me', 'caller_me'])
    .describe('Scope of tickets to retrieve'),
  status: z
    .array(z.string())
    .optional()
    .describe('Filter by status (e.g., ["firstLine", "secondLine"])'),
  since: z
    .string()
    .optional()
    .describe('Filter tickets created since this ISO date'),
  limit: z.number().default(50).describe('Maximum number of tickets to return'),
  cursor: z.string().optional().describe('Pagination cursor'),
});

export async function ticketsMyList(
  client: TopdeskClient,
  args: z.infer<typeof ticketsMyListSchema>
): Promise<PaginatedResponse<unknown>> {
  const { scope, status, since, limit, cursor } = args;

  // Build query parameters
  const params: Record<string, unknown> = {
    page_size: limit,
  };

  if (cursor) {
    const start = parseInt(cursor, 10);
    if (!isNaN(start)) {
      params.start = start;
    }
  }

  // Add scope filter
  switch (scope) {
    case 'assigned_to_me':
      params.operator = '@me';
      break;
    case 'created_by_me':
      params.caller = '@me';
      break;
    case 'operator_me':
      params.operator = '@me';
      break;
    case 'caller_me':
      params.caller = '@me';
      break;
  }

  // Add status filter
  if (status && status.length > 0) {
    params.status = status.join(',');
  }

  // Add date filter
  if (since) {
    params.creation_date_start = since;
  }

  // Make request
  const response = await client.get('/tas/api/incidents', params);
  const items = Array.isArray(response.data) ? response.data : [];

  return buildPaginatedResponse(items, {
    currentStart: parseInt(cursor || '0', 10),
    pageSize: limit,
  });
}

export const ticketsGetSchema = z.object({
  id: z.string().describe('Ticket ID'),
});

export async function ticketsGet(
  client: TopdeskClient,
  args: z.infer<typeof ticketsGetSchema>
): Promise<unknown> {
  const { id } = args;
  const response = await client.get(`/tas/api/incidents/id/${id}`);
  return response.data;
}

export const ticketsSearchSchema = z.object({
  query: z.string().optional().describe('Search query'),
  status: z.array(z.string()).optional().describe('Filter by status'),
  priority: z.string().optional().describe('Filter by priority'),
  since: z.string().optional().describe('Filter tickets since this ISO date'),
  limit: z.number().default(50).describe('Maximum number of tickets'),
  cursor: z.string().optional().describe('Pagination cursor'),
});

export async function ticketsSearch(
  client: TopdeskClient,
  args: z.infer<typeof ticketsSearchSchema>
): Promise<PaginatedResponse<unknown>> {
  const { query, status, priority, since, limit, cursor } = args;

  const params: Record<string, unknown> = {
    page_size: limit,
  };

  if (cursor) {
    const start = parseInt(cursor, 10);
    if (!isNaN(start)) {
      params.start = start;
    }
  }

  if (query) {
    params.query = query;
  }

  if (status && status.length > 0) {
    params.status = status.join(',');
  }

  if (priority) {
    params.priority = priority;
  }

  if (since) {
    params.creation_date_start = since;
  }

  const response = await client.get('/tas/api/incidents', params);
  const items = Array.isArray(response.data) ? response.data : [];

  return buildPaginatedResponse(items, {
    currentStart: parseInt(cursor || '0', 10),
    pageSize: limit,
  });
}

// ============================================================================
// ASSETS
// ============================================================================

export const assetsCreateSchema = z.object({
  name: z.string().describe('Asset name'),
  type: z.string().optional().describe('Asset type'),
  serialNumber: z.string().optional().describe('Serial number'),
  assetTag: z.string().optional().describe('Asset tag'),
  location: z.string().optional().describe('Location'),
  user: z.string().optional().describe('User ID or email'),
  fields: z.record(z.unknown()).optional().describe('Additional custom fields'),
});

export async function assetsCreate(
  client: TopdeskClient,
  args: z.infer<typeof assetsCreateSchema>
): Promise<unknown> {
  const { fields, ...standardFields } = args;

  const body = {
    ...standardFields,
    ...(fields || {}),
  };

  const response = await client.post('/tas/api/assetmgmt/assets', body);
  return response.data;
}

export const assetsUpdateSchema = z.object({
  id: z.string().describe('Asset ID'),
  name: z.string().optional().describe('Asset name'),
  type: z.string().optional().describe('Asset type'),
  serialNumber: z.string().optional().describe('Serial number'),
  assetTag: z.string().optional().describe('Asset tag'),
  location: z.string().optional().describe('Location'),
  user: z.string().optional().describe('User ID or email'),
  fields: z.record(z.unknown()).optional().describe('Additional custom fields'),
});

export async function assetsUpdate(
  client: TopdeskClient,
  args: z.infer<typeof assetsUpdateSchema>
): Promise<unknown> {
  const { id, fields, ...standardFields } = args;

  const body = {
    ...standardFields,
    ...(fields || {}),
  };

  const response = await client.put(`/tas/api/assetmgmt/assets/${id}`, body);
  return response.data;
}

export const assetsGetSchema = z.object({
  id: z.string().describe('Asset ID'),
});

export async function assetsGet(
  client: TopdeskClient,
  args: z.infer<typeof assetsGetSchema>
): Promise<unknown> {
  const { id } = args;
  const response = await client.get(`/tas/api/assetmgmt/assets/${id}`);
  return response.data;
}

export const assetsSearchSchema = z.object({
  name: z.string().optional().describe('Search by name'),
  serialNumber: z.string().optional().describe('Search by serial number'),
  assetTag: z.string().optional().describe('Search by asset tag'),
  type: z.string().optional().describe('Filter by type'),
  location: z.string().optional().describe('Filter by location'),
  user: z.string().optional().describe('Filter by user'),
  limit: z.number().default(50).describe('Maximum number of assets'),
  cursor: z.string().optional().describe('Pagination cursor'),
});

export async function assetsSearch(
  client: TopdeskClient,
  args: z.infer<typeof assetsSearchSchema>
): Promise<PaginatedResponse<unknown>> {
  const {
    name,
    serialNumber,
    assetTag,
    type,
    location,
    user,
    limit,
    cursor,
  } = args;

  const params: Record<string, unknown> = {
    page_size: limit,
  };

  if (cursor) {
    const start = parseInt(cursor, 10);
    if (!isNaN(start)) {
      params.start = start;
    }
  }

  if (name) params.name = name;
  if (serialNumber) params.serialNumber = serialNumber;
  if (assetTag) params.assetTag = assetTag;
  if (type) params.type = type;
  if (location) params.location = location;
  if (user) params.user = user;

  const response = await client.get('/tas/api/assetmgmt/assets', params);
  const items = Array.isArray(response.data) ? response.data : [];

  return buildPaginatedResponse(items, {
    currentStart: parseInt(cursor || '0', 10),
    pageSize: limit,
  });
}

// ============================================================================
// KNOWLEDGE ITEMS
// ============================================================================

export const knowledgeSearchSchema = z.object({
  query: z.string().optional().describe('Search query text'),
  category: z.string().optional().describe('Filter by category'),
  lastModifiedSince: z
    .string()
    .optional()
    .describe('Filter items modified since this ISO date'),
  limit: z.number().default(50).describe('Maximum number of items'),
  cursor: z.string().optional().describe('Pagination cursor'),
});

export async function knowledgeSearch(
  client: TopdeskClient,
  args: z.infer<typeof knowledgeSearchSchema>
): Promise<PaginatedResponse<unknown>> {
  const { query, category, lastModifiedSince, limit, cursor } = args;

  const params: Record<string, unknown> = {
    page_size: limit,
  };

  if (cursor) {
    const start = parseInt(cursor, 10);
    if (!isNaN(start)) {
      params.start = start;
    }
  }

  if (query) params.query = query;
  if (category) params.category = category;
  if (lastModifiedSince) params.last_modified_since = lastModifiedSince;

  const response = await client.get('/tas/api/knowledgeItems', params);
  const items = Array.isArray(response.data) ? response.data : [];

  return buildPaginatedResponse(items, {
    currentStart: parseInt(cursor || '0', 10),
    pageSize: limit,
  });
}

export const knowledgeGetSchema = z.object({
  id: z.string().describe('Knowledge item ID'),
});

export async function knowledgeGet(
  client: TopdeskClient,
  args: z.infer<typeof knowledgeGetSchema>
): Promise<unknown> {
  const { id } = args;
  const response = await client.get(`/tas/api/knowledgeItems/id/${id}`);
  return response.data;
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export interface HighLevelTool {
  name: string;
  description: string;
  inputSchema: z.ZodObject<z.ZodRawShape>;
  handler: (client: TopdeskClient, args: Record<string, unknown>) => Promise<unknown>;
}

export const highLevelTools: HighLevelTool[] = [
  // Tickets
  {
    name: 'topdesk.tickets.my_list',
    description:
      'List tickets assigned to me or where I am operator/caller. Supports filtering by status, priority, and date.',
    inputSchema: ticketsMyListSchema,
    handler: (client, args) => ticketsMyList(client, args as z.infer<typeof ticketsMyListSchema>),
  },
  {
    name: 'topdesk.tickets.get',
    description: 'Get detailed information about a specific ticket by ID.',
    inputSchema: ticketsGetSchema,
    handler: (client, args) => ticketsGet(client, args as z.infer<typeof ticketsGetSchema>),
  },
  {
    name: 'topdesk.tickets.search',
    description:
      'Search tickets with flexible filters including query text, status, priority, and date range.',
    inputSchema: ticketsSearchSchema,
    handler: (client, args) => ticketsSearch(client, args as z.infer<typeof ticketsSearchSchema>),
  },

  // Assets
  {
    name: 'topdesk.assets.create',
    description:
      'Create a new asset with name, type, serial number, asset tag, and other properties.',
    inputSchema: assetsCreateSchema,
    handler: (client, args) => assetsCreate(client, args as z.infer<typeof assetsCreateSchema>),
  },
  {
    name: 'topdesk.assets.update',
    description: 'Update an existing asset by ID with new property values.',
    inputSchema: assetsUpdateSchema,
    handler: (client, args) => assetsUpdate(client, args as z.infer<typeof assetsUpdateSchema>),
  },
  {
    name: 'topdesk.assets.get',
    description: 'Get detailed information about a specific asset by ID.',
    inputSchema: assetsGetSchema,
    handler: (client, args) => assetsGet(client, args as z.infer<typeof assetsGetSchema>),
  },
  {
    name: 'topdesk.assets.search',
    description:
      'Search assets by name, serial number, asset tag, type, location, or user.',
    inputSchema: assetsSearchSchema,
    handler: (client, args) => assetsSearch(client, args as z.infer<typeof assetsSearchSchema>),
  },

  // Knowledge
  {
    name: 'topdesk.knowledge.search',
    description:
      'Search knowledge base items by query text, category, or modification date.',
    inputSchema: knowledgeSearchSchema,
    handler: (client, args) => knowledgeSearch(client, args as z.infer<typeof knowledgeSearchSchema>),
  },
  {
    name: 'topdesk.knowledge.get',
    description: 'Get detailed information about a specific knowledge item by ID.',
    inputSchema: knowledgeGetSchema,
    handler: (client, args) => knowledgeGet(client, args as z.infer<typeof knowledgeGetSchema>),
  },
];
