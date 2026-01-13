# TOPdesk MCP Server

Production-ready Model Context Protocol (MCP) server for TOPdesk API integration. Provides both auto-generated raw API tools and curated high-level tools for common operations.

## Features

- **Two-tier tool strategy**: High-level curated tools for common tasks + raw auto-generated tools for full API coverage
- **API Token Authentication**: Secure authentication using TOPdesk API tokens
- **OpenAPI-based Discovery**: Automatic tool generation from OpenAPI/Swagger specs
- **Production-ready**: Rate limiting, retry logic, error handling, and concurrency control
- **Pagination Support**: Consistent pagination across all list operations
- **Debug Mode**: Safe logging without exposing secrets

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file or export the following variables:

```bash
# Required
TOPDESK_BASE_URL=https://your-tenant.topdesk.net
TOPDESK_API_TOKEN=your-api-token-here

# Optional
TOPDESK_OPENAPI_PATH=/path/to/openapi.json  # Path to OpenAPI spec file
DEBUG=true  # Enable debug logging (default: false)
```

### Getting Your API Token

1. Log in to TOPdesk as an operator with API access
2. Go to Settings > API
3. Create a new application password
4. Copy the token and set it as `TOPDESK_API_TOKEN`

### OpenAPI Specification

The server can auto-generate tools from an OpenAPI specification:

1. **Export from TOPdesk**: If your TOPdesk instance provides an OpenAPI spec, download it
2. **Use provided spec**: Some TOPdesk versions expose specs at `/tas/api/swagger.json`
3. **Manual registry**: If no spec is available, the server uses a built-in registry of common endpoints

To use an OpenAPI spec:

```bash
export TOPDESK_OPENAPI_PATH=/path/to/topdesk-openapi.json
```

Supported formats: `.json`, `.yaml`, `.yml`

## Running the Server

### Development Mode

```bash
npm run dev
```

### Build and Run

```bash
npm run build
npm start
```

## Available Tools

### High-Level Curated Tools

These tools provide clean, user-friendly interfaces for common operations:

#### Tickets

##### `topdesk.tickets.my_list`

List tickets assigned to you or where you are operator/caller.

**Input:**
```json
{
  "scope": "assigned_to_me",  // or "created_by_me", "operator_me", "caller_me"
  "status": ["firstLine", "secondLine"],  // optional
  "since": "2024-01-01T00:00:00Z",  // optional
  "limit": 50,  // default: 50
  "cursor": "100"  // optional, for pagination
}
```

**Output:**
```json
{
  "items": [
    {
      "id": "abc-123",
      "number": "I 2024 0001",
      "briefDescription": "Login issue",
      "status": "firstLine",
      "priority": "normal",
      "created": "2024-01-15T10:30:00Z",
      "caller": { "name": "John Doe" },
      "operator": { "name": "Jane Smith" }
    }
  ],
  "nextCursor": "150",
  "hasMore": true
}
```

##### `topdesk.tickets.get`

Get detailed information about a specific ticket.

**Input:**
```json
{
  "id": "abc-123"
}
```

##### `topdesk.tickets.search`

Search tickets with flexible filters.

**Input:**
```json
{
  "query": "login issue",  // optional
  "status": ["firstLine"],  // optional
  "priority": "high",  // optional
  "since": "2024-01-01T00:00:00Z",  // optional
  "limit": 50,
  "cursor": "0"
}
```

#### Assets

##### `topdesk.assets.create`

Create a new asset.

**Input:**
```json
{
  "name": "Dell Laptop",
  "type": "Laptop",  // optional
  "serialNumber": "SN12345",  // optional
  "assetTag": "AT-001",  // optional
  "location": "Office 1",  // optional
  "user": "john.doe@example.com",  // optional
  "fields": {  // optional, for custom fields
    "purchaseDate": "2024-01-01",
    "warrantyEnd": "2027-01-01"
  }
}
```

##### `topdesk.assets.update`

Update an existing asset.

**Input:**
```json
{
  "id": "asset-123",
  "name": "Dell Laptop (Updated)",
  "location": "Office 2",
  "fields": {
    "lastMaintenance": "2024-03-01"
  }
}
```

##### `topdesk.assets.get`

Get detailed information about a specific asset.

**Input:**
```json
{
  "id": "asset-123"
}
```

##### `topdesk.assets.search`

Search assets by various criteria.

**Input:**
```json
{
  "name": "Dell",  // optional
  "serialNumber": "SN12345",  // optional
  "assetTag": "AT-001",  // optional
  "type": "Laptop",  // optional
  "location": "Office 1",  // optional
  "user": "john.doe@example.com",  // optional
  "limit": 50,
  "cursor": "0"
}
```

#### Knowledge Items

##### `topdesk.knowledge.search`

Search knowledge base items.

**Input:**
```json
{
  "query": "password reset",  // optional
  "category": "IT",  // optional
  "lastModifiedSince": "2024-01-01T00:00:00Z",  // optional
  "limit": 50,
  "cursor": "0"
}
```

**Output:**
```json
{
  "items": [
    {
      "id": "kb-001",
      "title": "How to reset your password",
      "category": "IT",
      "lastModified": "2024-01-15T10:30:00Z"
    }
  ],
  "nextCursor": "50",
  "hasMore": true
}
```

##### `topdesk.knowledge.get`

Get detailed information about a specific knowledge item.

**Input:**
```json
{
  "id": "kb-001"
}
```

### Raw Generated Tools

Raw tools are automatically generated from the OpenAPI spec or manual registry. They provide direct access to all TOPdesk API endpoints.

**Naming convention:** `topdesk.raw.<tag>.<operationId>`

**Examples:**
- `topdesk.raw.incidents.listIncidents`
- `topdesk.raw.incidents.getIncidentById`
- `topdesk.raw.assets.createAsset`
- `topdesk.raw.knowledge.listKnowledgeItems`

**Raw tool format:**

All raw tools accept:
- `path_*` parameters for path variables (e.g., `path_id`)
- `query` object for query parameters
- `body` object for request body

All raw tools return:
```json
{
  "status": 200,
  "headers": { "content-type": "application/json" },
  "data": { /* raw API response */ }
}
```

## Pagination

All list operations support pagination:

- **`limit`**: Maximum number of items to return (default: 50)
- **`cursor`**: Opaque cursor for fetching the next page
- **Response includes**: `items`, `nextCursor`, and `hasMore`

Example pagination flow:

```javascript
// First page
const page1 = await callTool('topdesk.tickets.my_list', {
  scope: 'assigned_to_me',
  limit: 50
});

// Next page
if (page1.hasMore) {
  const page2 = await callTool('topdesk.tickets.my_list', {
    scope: 'assigned_to_me',
    limit: 50,
    cursor: page1.nextCursor
  });
}
```

## Error Handling

The server handles various error conditions:

- **401/403**: Authentication errors
- **404**: Resource not found
- **429**: Rate limiting (automatic retry with exponential backoff)
- **5xx**: Server errors (automatic retry up to 3 times)
- **Network errors**: Automatic retry with exponential backoff

All errors are returned in a consistent format with descriptive messages.

## Rate Limiting & Retries

The server implements production-ready resilience:

- **Concurrency limit**: Maximum 10 concurrent requests
- **Rate limiting**: Automatic retry on 429 with `Retry-After` header support
- **Exponential backoff**: 2s, 4s, 8s delays with ±25% jitter
- **Maximum retries**: 3 attempts for retryable errors
- **Timeout**: 20 seconds per request

## TOPdesk Permissions

Ensure your API token has the appropriate permissions:

### For Tickets
- Read incidents
- Create/update incidents (if using create/update operations)

### For Assets
- Read asset management data
- Create/update assets (if using create/update operations)

### For Knowledge Items
- Read knowledge base items

To check/configure permissions:
1. Go to TOPdesk Settings > Operators
2. Select your operator account
3. Check "Functional Settings" > "API" section

## MCP Client Configuration

Add this server to your MCP client configuration:

```json
{
  "mcpServers": {
    "topdesk": {
      "command": "node",
      "args": ["/path/to/topdesk-mcp-server/dist/index.js"],
      "env": {
        "TOPDESK_BASE_URL": "https://your-tenant.topdesk.net",
        "TOPDESK_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

Or for development:

```json
{
  "mcpServers": {
    "topdesk": {
      "command": "npm",
      "args": ["run", "dev"],
      "cwd": "/path/to/topdesk-mcp-server",
      "env": {
        "TOPDESK_BASE_URL": "https://your-tenant.topdesk.net",
        "TOPDESK_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

## Development

### Project Structure

```
src/
├── index.ts              # MCP server entry point
├── topdesk/
│   └── client.ts         # HTTP client with auth, retries, rate limiting
├── openapi/
│   ├── loader.ts         # OpenAPI spec loader with dereferencing
│   ├── generator.ts      # OpenAPI to MCP tool generator
│   └── manualRegistry.ts # Manual endpoint registry fallback
├── tools/
│   └── highlevel.ts      # Curated high-level tools
└── utils/
    ├── errors.ts         # Error handling utilities
    └── pagination.ts     # Pagination utilities
```

### Adding Manual Endpoints

If the OpenAPI spec is incomplete, add endpoints to `src/openapi/manualRegistry.ts`:

```typescript
{
  method: 'GET',
  path: '/tas/api/your-endpoint',
  operationId: 'yourOperation',
  summary: 'Description',
  tags: ['your-tag'],
  parameters: [
    {
      name: 'paramName',
      in: 'query',
      required: false,
      schema: { type: 'string' },
      description: 'Parameter description',
    },
  ],
  responses: {
    '200': {
      description: 'Success',
      content: {
        'application/json': {
          schema: { type: 'object' },
        },
      },
    },
  },
}
```

## Troubleshooting

### Authentication Issues

- Verify `TOPDESK_BASE_URL` is correct (should include `https://`)
- Check API token is valid and not expired
- Ensure operator has API access permissions

### Connection Issues

- Check network connectivity to TOPdesk instance
- Verify firewall rules allow outbound HTTPS
- Check for proxy requirements

### Debug Mode

Enable debug logging:

```bash
export DEBUG=true
npm run dev
```

Debug mode logs:
- Request details (without secrets)
- Response status and headers
- Retry attempts
- Tool registration

## Security

- API tokens are never logged (even in debug mode)
- All communication uses HTTPS
- Secrets should be stored in environment variables, not committed to version control
- Use `.env` files with `.gitignore` for local development

## License

MIT

## Support

For issues and questions:
- TOPdesk API documentation: https://developers.topdesk.com/
- TOPdesk support: Contact your TOPdesk administrator

## Changelog

### 1.0.0
- Initial release
- High-level curated tools for tickets, assets, and knowledge items
- OpenAPI-based raw tool generation
- Production-ready error handling, retries, and rate limiting
- Pagination support
- Debug mode
