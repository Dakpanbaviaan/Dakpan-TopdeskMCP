/**
 * Manual endpoint registry fallback
 * Use this when OpenAPI spec is not available
 *
 * To add more endpoints:
 * 1. Add the endpoint definition to the registry below
 * 2. Follow the OpenAPI operation format
 * 3. The tool generator will automatically create MCP tools from these definitions
 */

import { OpenAPIOperation } from './loader.js';

/**
 * Manual registry of TOPdesk API endpoints
 * Based on TOPdesk API documentation
 */
export const manualEndpointRegistry: OpenAPIOperation[] = [
  // Incidents (Tickets)
  {
    method: 'GET',
    path: '/tas/api/incidents',
    operationId: 'listIncidents',
    summary: 'List incidents',
    description: 'Retrieve a list of incidents with optional filtering',
    tags: ['incidents'],
    parameters: [
      {
        name: 'start',
        in: 'query',
        required: false,
        schema: { type: 'integer' },
        description: 'Start offset for pagination',
      },
      {
        name: 'page_size',
        in: 'query',
        required: false,
        schema: { type: 'integer' },
        description: 'Number of items per page',
      },
      {
        name: 'query',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Search query',
      },
      {
        name: 'status',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Filter by status',
      },
    ],
    responses: {
      '200': {
        description: 'List of incidents',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
  },
  {
    method: 'GET',
    path: '/tas/api/incidents/id/{id}',
    operationId: 'getIncidentById',
    summary: 'Get incident by ID',
    description: 'Retrieve a single incident by its ID',
    tags: ['incidents'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Incident ID',
      },
    ],
    responses: {
      '200': {
        description: 'Incident details',
        content: {
          'application/json': {
            schema: { type: 'object' },
          },
        },
      },
    },
  },
  {
    method: 'POST',
    path: '/tas/api/incidents',
    operationId: 'createIncident',
    summary: 'Create incident',
    description: 'Create a new incident',
    tags: ['incidents'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              briefDescription: { type: 'string' },
              request: { type: 'string' },
              callerLookup: { type: 'object' },
              status: { type: 'string' },
              priority: { type: 'string' },
            },
            required: ['briefDescription'],
          },
        },
      },
    },
    responses: {
      '201': {
        description: 'Created incident',
        content: {
          'application/json': {
            schema: { type: 'object' },
          },
        },
      },
    },
  },
  {
    method: 'PUT',
    path: '/tas/api/incidents/id/{id}',
    operationId: 'updateIncident',
    summary: 'Update incident',
    description: 'Update an existing incident',
    tags: ['incidents'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Incident ID',
      },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              briefDescription: { type: 'string' },
              request: { type: 'string' },
              status: { type: 'string' },
              priority: { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Updated incident',
        content: {
          'application/json': {
            schema: { type: 'object' },
          },
        },
      },
    },
  },

  // Assets
  {
    method: 'GET',
    path: '/tas/api/assetmgmt/assets',
    operationId: 'listAssets',
    summary: 'List assets',
    description: 'Retrieve a list of assets',
    tags: ['assets'],
    parameters: [
      {
        name: 'start',
        in: 'query',
        required: false,
        schema: { type: 'integer' },
        description: 'Start offset for pagination',
      },
      {
        name: 'page_size',
        in: 'query',
        required: false,
        schema: { type: 'integer' },
        description: 'Number of items per page',
      },
      {
        name: 'name',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Filter by name',
      },
    ],
    responses: {
      '200': {
        description: 'List of assets',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
  },
  {
    method: 'GET',
    path: '/tas/api/assetmgmt/assets/{id}',
    operationId: 'getAssetById',
    summary: 'Get asset by ID',
    description: 'Retrieve a single asset by its ID',
    tags: ['assets'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Asset ID',
      },
    ],
    responses: {
      '200': {
        description: 'Asset details',
        content: {
          'application/json': {
            schema: { type: 'object' },
          },
        },
      },
    },
  },
  {
    method: 'POST',
    path: '/tas/api/assetmgmt/assets',
    operationId: 'createAsset',
    summary: 'Create asset',
    description: 'Create a new asset',
    tags: ['assets'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
              serialNumber: { type: 'string' },
              assetTag: { type: 'string' },
            },
            required: ['name'],
          },
        },
      },
    },
    responses: {
      '201': {
        description: 'Created asset',
        content: {
          'application/json': {
            schema: { type: 'object' },
          },
        },
      },
    },
  },
  {
    method: 'PUT',
    path: '/tas/api/assetmgmt/assets/{id}',
    operationId: 'updateAsset',
    summary: 'Update asset',
    description: 'Update an existing asset',
    tags: ['assets'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Asset ID',
      },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
              serialNumber: { type: 'string' },
              assetTag: { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Updated asset',
        content: {
          'application/json': {
            schema: { type: 'object' },
          },
        },
      },
    },
  },

  // Knowledge Items
  {
    method: 'GET',
    path: '/tas/api/knowledgeItems',
    operationId: 'listKnowledgeItems',
    summary: 'List knowledge items',
    description: 'Retrieve a list of knowledge items',
    tags: ['knowledge'],
    parameters: [
      {
        name: 'start',
        in: 'query',
        required: false,
        schema: { type: 'integer' },
        description: 'Start offset for pagination',
      },
      {
        name: 'page_size',
        in: 'query',
        required: false,
        schema: { type: 'integer' },
        description: 'Number of items per page',
      },
      {
        name: 'query',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Search query',
      },
    ],
    responses: {
      '200': {
        description: 'List of knowledge items',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
  },
  {
    method: 'GET',
    path: '/tas/api/knowledgeItems/id/{id}',
    operationId: 'getKnowledgeItemById',
    summary: 'Get knowledge item by ID',
    description: 'Retrieve a single knowledge item by its ID',
    tags: ['knowledge'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Knowledge item ID',
      },
    ],
    responses: {
      '200': {
        description: 'Knowledge item details',
        content: {
          'application/json': {
            schema: { type: 'object' },
          },
        },
      },
    },
  },

  // Persons (for caller lookup)
  {
    method: 'GET',
    path: '/tas/api/persons',
    operationId: 'listPersons',
    summary: 'List persons',
    description: 'Retrieve a list of persons',
    tags: ['persons'],
    parameters: [
      {
        name: 'start',
        in: 'query',
        required: false,
        schema: { type: 'integer' },
        description: 'Start offset for pagination',
      },
      {
        name: 'page_size',
        in: 'query',
        required: false,
        schema: { type: 'integer' },
        description: 'Number of items per page',
      },
      {
        name: 'query',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Search query',
      },
    ],
    responses: {
      '200': {
        description: 'List of persons',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
  },
];
