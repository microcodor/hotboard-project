/**
 * HotBoard 库模块导出
 * 统一导出所有工具模块
 */

// 配置管理
export {
  appConfig,
  getConfigInstance,
  validateConfig,
} from './config';
export type { Config } from './config';

// 错误处理
export {
  AppError,
  ApiError,
  DatabaseError,
  CacheError,
  ConfigError,
  ValidationError,
  ErrorFactory,
  ErrorCode,
  isOperationalError,
  getErrorStatusCode,
  formatError,
  logError,
  asyncErrorHandler,
} from './errors';

// 速率限制
export {
  RateLimiter,
  TokenBucketRateLimiter,
  createRateLimiter,
  createTokenBucketLimiter,
} from './rate-limiter';
export type { RateLimiterConfig } from './rate-limiter';

// API 客户端
export {
  ApiClient,
  createApiClient,
} from './api-client';
export type {
  ApiClientConfig,
  RequestOptions,
  ApiResponse,
} from './api-client';

// TopHub 客户端
export {
  TopHubClient,
  createTopHubClient,
  getTopHubClient,
} from './tophub';
export type {
  TopHubNodeResponse,
  TopHubNodeDetailResponse,
  TopHubSearchResponse,
  TopHubNode,
  TopHubNodeDetail,
  TopHubItem,
  TopHubSearchResult,
} from './tophub';

// 缓存管理
export {
  MemoryCache,
  Cached,
  getCache,
  cacheUtils,
  createCache,
} from './cache';
export type { CacheStats } from './cache';

// 工具函数
export {
  cn,
  formatHotValue,
  formatTime,
  getRankColor,
  truncate,
} from './utils';
