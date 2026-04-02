/**
 * 错误类型定义与错误处理
 * 提供统一的错误处理机制
 */

/**
 * 错误代码枚举
 */
export enum ErrorCode {
  // API 错误 (1000-1999)
  API_ERROR = 1000,
  API_TIMEOUT = 1001,
  API_RATE_LIMIT = 1002,
  API_INVALID_RESPONSE = 1003,
  API_AUTH_ERROR = 1004,
  API_NOT_FOUND = 1005,
  
  // 数据库错误 (2000-2999)
  DB_ERROR = 2000,
  DB_CONNECTION_ERROR = 2001,
  DB_QUERY_ERROR = 2002,
  DB_NOT_FOUND = 2003,
  
  // 缓存错误 (3000-3999)
  CACHE_ERROR = 3000,
  CACHE_MISS = 3001,
  
  // 配置错误 (4000-4999)
  CONFIG_ERROR = 4000,
  CONFIG_MISSING = 4001,
  CONFIG_INVALID = 4002,
  
  // 验证错误 (5000-5999)
  VALIDATION_ERROR = 5000,
  VALIDATION_REQUIRED = 5001,
  VALIDATION_FORMAT = 5002,
  
  // 通用错误 (9000-9999)
  UNKNOWN_ERROR = 9999,
}

/**
 * 自定义应用错误类
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    statusCode: number = 500,
    details?: Record<string, any>,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    // 捕获堆栈跟踪
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 转换为 JSON 格式
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * API 错误类
 */
export class ApiError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.API_ERROR,
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message, code, statusCode, details);
    this.name = 'ApiError';
  }
}

/**
 * 数据库错误类
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.DB_ERROR,
    details?: Record<string, any>
  ) {
    super(message, code, 500, details);
    this.name = 'DatabaseError';
  }
}

/**
 * 缓存错误类
 */
export class CacheError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.CACHE_ERROR,
    details?: Record<string, any>
  ) {
    super(message, code, 500, details);
    this.name = 'CacheError';
  }
}

/**
 * 配置错误类
 */
export class ConfigError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.CONFIG_ERROR,
    details?: Record<string, any>
  ) {
    super(message, code, 500, details);
    this.name = 'ConfigError';
  }
}

/**
 * 验证错误类
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.VALIDATION_ERROR,
    details?: Record<string, any>
  ) {
    super(message, code, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * 错误工厂函数
 */
export const ErrorFactory = {
  /**
   * 创建 API 超时错误
   */
  apiTimeout(url: string, timeout: number) {
    return new ApiError(
      `Request to ${url} timed out after ${timeout}ms`,
      ErrorCode.API_TIMEOUT,
      408,
      { url, timeout }
    );
  },

  /**
   * 创建 API 速率限制错误
   */
  apiRateLimit(retryAfter?: number) {
    return new ApiError(
      'Rate limit exceeded',
      ErrorCode.API_RATE_LIMIT,
      429,
      { retryAfter }
    );
  },

  /**
   * 创建 API 认证错误
   */
  apiAuthError(message: string = 'Authentication failed') {
    return new ApiError(
      message,
      ErrorCode.API_AUTH_ERROR,
      401
    );
  },

  /**
   * 创建 API 未找到错误
   */
  apiNotFound(resource: string) {
    return new ApiError(
      `${resource} not found`,
      ErrorCode.API_NOT_FOUND,
      404,
      { resource }
    );
  },

  /**
   * 创建无效响应错误
   */
  apiInvalidResponse(url: string, reason: string) {
    return new ApiError(
      `Invalid response from ${url}: ${reason}`,
      ErrorCode.API_INVALID_RESPONSE,
      502,
      { url, reason }
    );
  },

  /**
   * 创建配置缺失错误
   */
  configMissing(key: string) {
    return new ConfigError(
      `Configuration key "${key}" is missing`,
      ErrorCode.CONFIG_MISSING,
      { key }
    );
  },

  /**
   * 创建验证错误
   */
  validationError(field: string, reason: string) {
    return new ValidationError(
      `Validation failed for field "${field}": ${reason}`,
      ErrorCode.VALIDATION_ERROR,
      { field, reason }
    );
  },
};

/**
 * 错误处理工具函数
 */

/**
 * 判断是否为操作错误（可预期的错误）
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * 获取错误的 HTTP 状态码
 */
export function getErrorStatusCode(error: Error): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  return 500;
}

/**
 * 格式化错误信息
 */
export function formatError(error: Error, includeStack: boolean = false): string {
  if (error instanceof AppError) {
    const parts = [
      `[${error.name}] Code: ${error.code}`,
      `Message: ${error.message}`,
    ];
    
    if (error.details) {
      parts.push(`Details: ${JSON.stringify(error.details)}`);
    }
    
    if (includeStack && error.stack) {
      parts.push(`Stack: ${error.stack}`);
    }
    
    return parts.join('\n');
  }
  
  return error.message;
}

/**
 * 错误日志记录器
 */
export function logError(error: Error, context?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const formattedError = formatError(error, true);
  
  console.error(`[${timestamp}] ERROR:`, formattedError);
  
  if (context) {
    console.error('Context:', JSON.stringify(context, null, 2));
  }
}

/**
 * 异步错误包装器
 */
export function asyncErrorHandler<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: Error) => void
): Promise<T | null> {
  return fn().catch((error) => {
    logError(error);
    errorHandler?.(error);
    return null;
  });
}
