/**
 * Custom error classes for TOPdesk MCP Server
 */

export class TopdeskError extends Error {
  constructor(message: string, public code?: string, public statusCode?: number) {
    super(message);
    this.name = 'TopdeskError';
  }
}

export class TopdeskAuthError extends TopdeskError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'TopdeskAuthError';
  }
}

export class TopdeskRateLimitError extends TopdeskError {
  constructor(
    message: string = 'Rate limit exceeded',
    public retryAfter?: number
  ) {
    super(message, 'RATE_LIMIT', 429);
    this.name = 'TopdeskRateLimitError';
  }
}

export class TopdeskNotFoundError extends TopdeskError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'TopdeskNotFoundError';
  }
}

export class TopdeskValidationError extends TopdeskError {
  constructor(message: string, public errors?: unknown) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'TopdeskValidationError';
  }
}

export class TopdeskNetworkError extends TopdeskError {
  constructor(message: string, public originalError?: Error) {
    super(message, 'NETWORK_ERROR');
    this.name = 'TopdeskNetworkError';
  }
}

export class TopdeskTimeoutError extends TopdeskError {
  constructor(message: string = 'Request timeout') {
    super(message, 'TIMEOUT');
    this.name = 'TopdeskTimeoutError';
  }
}

export class TopdeskServerError extends TopdeskError {
  constructor(message: string = 'Server error', statusCode: number = 500) {
    super(message, 'SERVER_ERROR', statusCode);
    this.name = 'TopdeskServerError';
  }
}

export class OpenAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenAPIError';
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof TopdeskRateLimitError) {
    return true;
  }

  if (error instanceof TopdeskServerError) {
    const statusCode = error.statusCode;
    // Retry on 5xx errors except 501 (Not Implemented)
    return statusCode !== undefined && statusCode >= 500 && statusCode !== 501;
  }

  if (error instanceof TopdeskNetworkError || error instanceof TopdeskTimeoutError) {
    return true;
  }

  return false;
}

/**
 * Get retry delay from error (for rate limiting)
 */
export function getRetryDelay(error: unknown): number | undefined {
  if (error instanceof TopdeskRateLimitError) {
    return error.retryAfter;
  }
  return undefined;
}

/**
 * Safe error message extraction
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}
