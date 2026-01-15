/**
 * TOPdesk HTTP Client with authentication, retries, rate limiting, and error handling
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';
import pLimit from 'p-limit';
import {
  TopdeskError,
  TopdeskAuthError,
  TopdeskRateLimitError,
  TopdeskNotFoundError,
  TopdeskValidationError,
  TopdeskNetworkError,
  TopdeskTimeoutError,
  TopdeskServerError,
  isRetryableError,
  getRetryDelay,
} from '../utils/errors.js';

const DEBUG = process.env.DEBUG === 'true';

interface TopdeskClientConfig {
  baseUrl: string;
  apiToken: string;
  useBasicAuth?: boolean;
  timeout?: number;
  maxRetries?: number;
  concurrencyLimit?: number;
}

interface RequestOptions extends AxiosRequestConfig {
  retryCount?: number;
}

export interface TopdeskResponse<T = unknown> {
  status: number;
  headers: Record<string, string>;
  data: T;
}

export class TopdeskClient {
  private client: AxiosInstance;
  private config: Required<TopdeskClientConfig>;
  private limiter: ReturnType<typeof pLimit>;

  private useBasicAuth: boolean;

  constructor(config: TopdeskClientConfig) {
    this.useBasicAuth = config.useBasicAuth ?? false;
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''), // Remove trailing slash
      apiToken: config.apiToken,
      useBasicAuth: this.useBasicAuth,
      timeout: config.timeout ?? 20000, // 20s default
      maxRetries: config.maxRetries ?? 3,
      concurrencyLimit: config.concurrencyLimit ?? 10,
    };

    this.limiter = pLimit(this.config.concurrencyLimit);

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Request interceptor: Add authentication
    this.client.interceptors.request.use(
      (config) => {
        // Add authentication based on type
        if (this.useBasicAuth) {
          config.headers.Authorization = `Basic ${this.config.apiToken}`;
        } else {
          config.headers.Authorization = `TOKEN id="${this.config.apiToken}"`;
        }

        if (DEBUG) {
          this.logRequest(config);
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: Handle errors
    this.client.interceptors.response.use(
      (response) => {
        if (DEBUG) {
          this.logResponse(response);
        }
        return response;
      },
      (error) => {
        if (DEBUG && error.response) {
          this.logResponse(error.response);
        }
        return Promise.reject(this.handleAxiosError(error));
      }
    );
  }

  /**
   * Make a GET request
   */
  async get<T = unknown>(
    path: string,
    params?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<TopdeskResponse<T>> {
    return this.request<T>({
      method: 'GET',
      url: path,
      params,
      ...options,
    });
  }

  /**
   * Make a POST request
   */
  async post<T = unknown>(
    path: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<TopdeskResponse<T>> {
    return this.request<T>({
      method: 'POST',
      url: path,
      data,
      ...options,
    });
  }

  /**
   * Make a PUT request
   */
  async put<T = unknown>(
    path: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<TopdeskResponse<T>> {
    return this.request<T>({
      method: 'PUT',
      url: path,
      data,
      ...options,
    });
  }

  /**
   * Make a PATCH request
   */
  async patch<T = unknown>(
    path: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<TopdeskResponse<T>> {
    return this.request<T>({
      method: 'PATCH',
      url: path,
      data,
      ...options,
    });
  }

  /**
   * Make a DELETE request
   */
  async delete<T = unknown>(
    path: string,
    options?: RequestOptions
  ): Promise<TopdeskResponse<T>> {
    return this.request<T>({
      method: 'DELETE',
      url: path,
      ...options,
    });
  }

  /**
   * Make a generic request with retry logic and rate limiting
   */
  private async request<T = unknown>(
    options: RequestOptions
  ): Promise<TopdeskResponse<T>> {
    return this.limiter(() => this.executeRequest<T>(options));
  }

  /**
   * Execute request with retry logic
   */
  private async executeRequest<T>(
    options: RequestOptions,
    retryCount: number = 0
  ): Promise<TopdeskResponse<T>> {
    try {
      const response = await this.client.request<T>(options);

      return {
        status: response.status,
        headers: this.extractHeaders(response.headers),
        data: response.data,
      };
    } catch (error) {
      // Check if we should retry
      if (isRetryableError(error) && retryCount < this.config.maxRetries) {
        const delay = this.calculateRetryDelay(error, retryCount);

        if (DEBUG) {
          console.error(
            `[TOPdesk] Request failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.config.maxRetries})`
          );
        }

        await this.sleep(delay);
        return this.executeRequest<T>(options, retryCount + 1);
      }

      // Max retries exceeded or non-retryable error
      throw error;
    }
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(error: unknown, retryCount: number): number {
    // Check for rate limit retry-after header
    const retryAfter = getRetryDelay(error);
    if (retryAfter !== undefined) {
      return retryAfter * 1000; // Convert to ms
    }

    // Exponential backoff: 2^retryCount * 1000ms
    const baseDelay = Math.pow(2, retryCount) * 1000;

    // Add jitter (±25%)
    const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1);

    return Math.min(baseDelay + jitter, 30000); // Cap at 30s
  }

  /**
   * Handle Axios errors and convert to custom error types
   */
  private handleAxiosError(error: AxiosError): Error {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new TopdeskTimeoutError('Request timeout');
    }

    if (!error.response) {
      return new TopdeskNetworkError(
        error.message || 'Network error',
        error
      );
    }

    const { status, data } = error.response;

    switch (status) {
      case 401:
      case 403:
        return new TopdeskAuthError(
          this.extractErrorMessage(data) || 'Authentication failed'
        );

      case 404:
        return new TopdeskNotFoundError(
          this.extractErrorMessage(data) || 'Resource not found'
        );

      case 400:
      case 422:
        return new TopdeskValidationError(
          this.extractErrorMessage(data) || 'Validation error',
          data
        );

      case 429: {
        const retryAfter = this.extractRetryAfter(error.response);
        return new TopdeskRateLimitError('Rate limit exceeded', retryAfter);
      }

      case 500:
      case 502:
      case 503:
      case 504:
        return new TopdeskServerError(
          this.extractErrorMessage(data) || 'Server error',
          status
        );

      default:
        return new TopdeskError(
          this.extractErrorMessage(data) || `HTTP ${status} error`,
          'HTTP_ERROR',
          status
        );
    }
  }

  /**
   * Extract error message from response data
   */
  private extractErrorMessage(data: unknown): string | undefined {
    if (!data) return undefined;

    if (typeof data === 'string') {
      return data;
    }

    if (typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      return (
        (obj.message as string) ||
        (obj.error as string) ||
        (obj.errorMessage as string) ||
        undefined
      );
    }

    return undefined;
  }

  /**
   * Extract Retry-After header (in seconds)
   */
  private extractRetryAfter(response: AxiosResponse): number | undefined {
    const retryAfter = response.headers['retry-after'];
    if (!retryAfter) return undefined;

    const seconds = parseInt(retryAfter, 10);
    return isNaN(seconds) ? undefined : seconds;
  }

  /**
   * Extract headers from response
   */
  private extractHeaders(
    headers: AxiosResponse['headers']
  ): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string') {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Safe request logging (without secrets)
   */
  private logRequest(config: AxiosRequestConfig): void {
    const safeConfig = {
      method: config.method?.toUpperCase(),
      url: config.url,
      params: config.params,
      // Don't log authorization header or data that might contain secrets
    };

    console.log('[TOPdesk] Request:', JSON.stringify(safeConfig, null, 2));
  }

  /**
   * Safe response logging (without secrets)
   */
  private logResponse(response: AxiosResponse): void {
    const safeResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      // Only log data if it's small
      dataSize: JSON.stringify(response.data || {}).length,
    };

    console.log('[TOPdesk] Response:', JSON.stringify(safeResponse, null, 2));
  }
}

/**
 * Create a TOPdesk client instance from environment variables
 */
export function createTopdeskClientFromEnv(): TopdeskClient {
  const baseUrl = process.env.TOPDESK_BASE_URL;
  const apiToken = process.env.TOPDESK_API_TOKEN;
  const username = process.env.TOPDESK_USERNAME;
  const apiKey = process.env.TOPDESK_API_KEY;

  if (!baseUrl) {
    throw new Error('TOPDESK_BASE_URL environment variable is required');
  }

  // Support both TOKEN auth and Basic Auth (username + api key)
  let token: string;
  if (apiToken) {
    token = apiToken;
  } else if (username && apiKey) {
    // Create Basic Auth token from username:api_key
    token = Buffer.from(`${username}:${apiKey}`).toString('base64');
  } else {
    throw new Error('Either TOPDESK_API_TOKEN or both TOPDESK_USERNAME and TOPDESK_API_KEY are required');
  }

  return new TopdeskClient({
    baseUrl,
    apiToken: token,
    useBasicAuth: !!(username && apiKey),
  });
}
