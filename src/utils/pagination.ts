/**
 * Pagination utilities for TOPdesk API
 */

export interface PaginationOptions {
  pageSize?: number;
  cursor?: string;
  maxPages?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  totalPages?: number;
}

/**
 * Parse TOPdesk pagination parameters
 * TOPdesk typically uses 'start' and 'page_size' parameters
 */
export function buildPaginationParams(options: PaginationOptions): {
  start?: number;
  page_size?: number;
} {
  const params: { start?: number; page_size?: number } = {};

  if (options.pageSize) {
    params.page_size = options.pageSize;
  }

  if (options.cursor) {
    // Cursor is typically a start offset
    const start = parseInt(options.cursor, 10);
    if (!isNaN(start)) {
      params.start = start;
    }
  }

  return params;
}

/**
 * Calculate next cursor from current pagination state
 */
export function calculateNextCursor(
  currentStart: number,
  pageSize: number,
  itemsReturned: number
): string | undefined {
  if (itemsReturned < pageSize) {
    // No more results
    return undefined;
  }
  return String(currentStart + pageSize);
}

/**
 * Check if we've reached max pages limit
 */
export function hasReachedMaxPages(
  currentPage: number,
  maxPages?: number
): boolean {
  if (maxPages === undefined) {
    return false;
  }
  return currentPage >= maxPages;
}

/**
 * Parse cursor to get page number
 */
export function parseCursor(cursor?: string): { start: number; page: number } {
  if (!cursor) {
    return { start: 0, page: 1 };
  }

  const start = parseInt(cursor, 10);
  if (isNaN(start)) {
    return { start: 0, page: 1 };
  }

  return { start, page: Math.floor(start / 50) + 1 };
}

/**
 * Build a paginated response
 */
export function buildPaginatedResponse<T>(
  items: T[],
  options: {
    currentStart: number;
    pageSize: number;
    hasMore?: boolean;
  }
): PaginatedResponse<T> {
  const { currentStart, pageSize, hasMore } = options;

  // Determine if there are more results
  const shouldHaveMore = hasMore ?? items.length >= pageSize;

  return {
    items,
    nextCursor: shouldHaveMore
      ? calculateNextCursor(currentStart, pageSize, items.length)
      : undefined,
    hasMore: shouldHaveMore,
  };
}

/**
 * Merge multiple paginated responses
 */
export function mergePaginatedResponses<T>(
  responses: PaginatedResponse<T>[]
): PaginatedResponse<T> {
  if (responses.length === 0) {
    return {
      items: [],
      hasMore: false,
    };
  }

  const lastResponse = responses[responses.length - 1];

  return {
    items: responses.flatMap((r) => r.items),
    nextCursor: lastResponse.nextCursor,
    hasMore: lastResponse.hasMore,
  };
}
