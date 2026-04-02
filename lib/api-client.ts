/**
 * 通用 API 客户端
 * 提供重试、超时、错误处理等功能
 */

import { ApiError, ErrorCode, ErrorFactory, logError } from './errors';
import { RateLimiter, createRateLimiter } from './rate-limiter';

/**
 * API 客户端配置
 */
export interface ApiClientConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  rateLimiter?: RateLimiter;
}

/**
 * 请求选项
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  skipRateLimit?: boolean;
}

/**
 * 响应包装
 */
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
}

/**
 * API 客户端类
 */
export class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultRetries: number;
  private retryDelay: number;
  private defaultHeaders: Record<string, string>;
  private rateLimiter: RateLimiter;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || '';
    this.defaultTimeout = config.timeout || 30000;
    this.defaultRetries = config.retries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    this.rateLimiter = config.rateLimiter || createRateLimiter();
  }

  /**
   * 发起 HTTP 请求
   */
  async request<T = any>(
    url: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      skipRateLimit = false,
    } = options;

    // 检查速率限制
    if (!skipRateLimit) {
      await this.rateLimiter.checkLimit();
    }

    const fullUrl = this.baseUrl + url;
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    let lastError: Error | null = null;
    
    // 重试循环
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // 创建 AbortController 用于超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(fullUrl, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 检查响应状态
        if (!response.ok) {
          await this.handleErrorResponse(response, fullUrl);
        }

        // 解析响应数据
        const data = await this.parseResponse<T>(response);

        return {
          data,
          status: response.status,
          headers: response.headers,
        };
      } catch (error) {
        lastError = error as Error;

        // 判断是否应该重试
        if (!this.shouldRetry(error as Error, attempt, retries)) {
          throw error;
        }

        // 延迟后重试
        if (attempt < retries) {
          const delay = this.retryDelay * Math.pow(2, attempt); // 指数退避
          await this.sleep(delay);
        }
      }
    }

    // 所有重试都失败
    throw lastError || new ApiError('Request failed after retries');
  }

  /**
   * GET 请求
   */
  async get<T = any>(
    url: string,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST 请求
   */
  async post<T = any>(
    url: string,
    body?: any,
    options?: Omit<RequestOptions, 'method'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'POST', body });
  }

  /**
   * PUT 请求
   */
  async put<T = any>(
    url: string,
    body?: any,
    options?: Omit<RequestOptions, 'method'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE 请求
   */
  async delete<T = any>(
    url: string,
    options?: Omit<RequestOptions, 'method'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  /**
   * 处理错误响应
   */
  private async handleErrorResponse(response: Response, url: string): Promise<never> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorDetails: any = {};

    try {
      const errorBody = await response.json();
      errorDetails = errorBody;
      errorMessage = errorBody.message || errorBody.error || errorMessage;
    } catch {
      // 无法解析错误响应体
    }

    // 根据状态码创建特定错误
    switch (response.status) {
      case 401:
        throw ErrorFactory.apiAuthError(errorMessage);
      case 404:
        throw ErrorFactory.apiNotFound(url);
      case 429:
        const retryAfter = response.headers.get('Retry-After');
        throw ErrorFactory.apiRateLimit(retryAfter ? parseInt(retryAfter, 10) : undefined);
      default:
        throw new ApiError(
          errorMessage,
          ErrorCode.API_ERROR,
          response.status,
          { url, status: response.status, details: errorDetails }
        );
    }
  }

  /**
   * 解析响应数据
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      try {
        return await response.json();
      } catch (error) {
        throw ErrorFactory.apiInvalidResponse(
          response.url,
          'Invalid JSON response'
        );
      }
    }

    // 对于非 JSON 响应，返回文本
    const text = await response.text();
    return text as unknown as T;
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: Error, attempt: number, maxRetries: number): boolean {
    // 已达到最大重试次数
    if (attempt >= maxRetries) {
      return false;
    }

    // 网络错误、超时错误可以重试
    if (error.name === 'AbortError' || error.message.includes('network')) {
      return true;
    }

    // 5xx 服务器错误可以重试
    if (error instanceof ApiError && error.statusCode >= 500) {
      return true;
    }

    // 速率限制错误不重试
    if (error instanceof ApiError && error.code === ErrorCode.API_RATE_LIMIT) {
      return false;
    }

    // 4xx 客户端错误不重试
    if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500) {
      return false;
    }

    return false;
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 更新默认请求头
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    Object.assign(this.defaultHeaders, headers);
  }

  /**
   * 设置认证头
   */
  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * 清除认证头
   */
  clearAuthToken(): void {
    delete this.defaultHeaders['Authorization'];
  }

  /**
   * 获取速率限制器状态
   */
  getRateLimitStatus() {
    return this.rateLimiter.getStatus();
  }
}

/**
 * 创建默认 API 客户端
 */
export function createApiClient(config?: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
