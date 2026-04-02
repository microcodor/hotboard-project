/**
 * 速率限制器
 * 支持滑动窗口算法，防止 API 过载
 */

import { ErrorCode, ErrorFactory } from './errors';

/**
 * 速率限制器配置
 */
export interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: () => string;
}

/**
 * 请求记录
 */
interface RequestRecord {
  timestamp: number;
  count: number;
}

/**
 * 速率限制器类
 * 使用滑动窗口算法实现
 */
export class RateLimiter {
  private maxRequests: number;
  private windowMs: number;
  private keyGenerator: () => string;
  private requests: Map<string, RequestRecord[]> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: RateLimiterConfig) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
    this.keyGenerator = config.keyGenerator || (() => 'default');
    
    // 启动定期清理过期记录
    this.startCleanup();
  }

  /**
   * 检查是否可以发起请求
   * @param key 可选的键，用于区分不同的限制器实例
   * @throws {ApiError} 如果超出速率限制
   */
  async checkLimit(key?: string): Promise<void> {
    const actualKey = key || this.keyGenerator();
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // 获取或创建请求记录
    let records = this.requests.get(actualKey) || [];
    
    // 过滤掉过期的记录
    records = records.filter(r => r.timestamp > windowStart);
    
    // 计算窗口内的请求数
    const totalRequests = records.reduce((sum, r) => sum + r.count, 0);

    if (totalRequests >= this.maxRequests) {
      const oldestRecord = records[0];
      const retryAfter = oldestRecord
        ? Math.ceil((oldestRecord.timestamp + this.windowMs - now) / 1000)
        : Math.ceil(this.windowMs / 1000);
      
      throw ErrorFactory.apiRateLimit(retryAfter);
    }

    // 记录当前请求
    records.push({ timestamp: now, count: 1 });
    this.requests.set(actualKey, records);
  }

  /**
   * 等待直到可以发起请求
   * @param key 可选的键
   * @returns 等待时间（毫秒），0 表示无需等待
   */
  async waitForSlot(key?: string): Promise<number> {
    const actualKey = key || this.keyGenerator();
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let records = this.requests.get(actualKey) || [];
    records = records.filter(r => r.timestamp > windowStart);
    
    const totalRequests = records.reduce((sum, r) => sum + r.count, 0);

    if (totalRequests < this.maxRequests) {
      return 0;
    }

    // 计算需要等待的时间
    const oldestRecord = records[0];
    if (oldestRecord) {
      const waitTime = oldestRecord.timestamp + this.windowMs - now;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return waitTime;
      }
    }

    return 0;
  }

  /**
   * 重置指定键的记录
   */
  reset(key?: string): void {
    const actualKey = key || this.keyGenerator();
    this.requests.delete(actualKey);
  }

  /**
   * 重置所有记录
   */
  resetAll(): void {
    this.requests.clear();
  }

  /**
   * 获取当前状态
   */
  getStatus(key?: string): {
    remaining: number;
    resetTime: number;
    total: number;
  } {
    const actualKey = key || this.keyGenerator();
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let records = this.requests.get(actualKey) || [];
    records = records.filter(r => r.timestamp > windowStart);
    
    const totalRequests = records.reduce((sum, r) => sum + r.count, 0);
    const oldestRecord = records[0];

    return {
      remaining: Math.max(0, this.maxRequests - totalRequests),
      resetTime: oldestRecord ? oldestRecord.timestamp + this.windowMs : now,
      total: totalRequests,
    };
  }

  /**
   * 启动定期清理
   */
  private startCleanup(): void {
    // 每分钟清理一次过期记录
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [key, records] of this.requests.entries()) {
        const filtered = records.filter(r => r.timestamp > now - this.windowMs * 2);
        
        if (filtered.length === 0) {
          this.requests.delete(key);
        } else {
          this.requests.set(key, filtered);
        }
      }
    }, 60000);
  }

  /**
   * 停止定期清理
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    this.stopCleanup();
    this.requests.clear();
  }
}

/**
 * 令牌桶速率限制器
 * 适用于突发流量控制
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // 每秒补充的令牌数
  private lastRefill: number;
  private keyGenerator: () => string;
  private buckets: Map<string, {
    tokens: number;
    lastRefill: number;
  }> = new Map();

  constructor(config: {
    maxTokens: number;
    refillRate: number;
    keyGenerator?: () => string;
  }) {
    this.maxTokens = config.maxTokens;
    this.tokens = config.maxTokens;
    this.refillRate = config.refillRate;
    this.lastRefill = Date.now();
    this.keyGenerator = config.keyGenerator || (() => 'default');
  }

  /**
   * 尝试消费令牌
   * @param tokens 需要消费的令牌数
   * @param key 可选的键
   * @returns 是否成功消费
   */
  consume(tokens: number = 1, key?: string): boolean {
    const actualKey = key || this.keyGenerator();
    const now = Date.now();
    
    // 获取或创建桶
    let bucket = this.buckets.get(actualKey);
    if (!bucket) {
      bucket = {
        tokens: this.maxTokens,
        lastRefill: now,
      };
      this.buckets.set(actualKey, bucket);
    }

    // 补充令牌
    const elapsed = (now - bucket.lastRefill) / 1000;
    const refill = elapsed * this.refillRate;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + refill);
    bucket.lastRefill = now;

    // 尝试消费
    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * 等待直到有足够的令牌
   */
  async waitForTokens(tokens: number = 1, key?: string): Promise<void> {
    const actualKey = key || this.keyGenerator();
    
    while (!this.consume(tokens, actualKey)) {
      const waitTime = 1000 / this.refillRate;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * 获取当前令牌数
   */
  getTokens(key?: string): number {
    const actualKey = key || this.keyGenerator();
    const bucket = this.buckets.get(actualKey);
    
    if (!bucket) {
      return this.maxTokens;
    }

    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    const refill = elapsed * this.refillRate;
    
    return Math.min(this.maxTokens, bucket.tokens + refill);
  }

  /**
   * 重置桶
   */
  reset(key?: string): void {
    const actualKey = key || this.keyGenerator();
    this.buckets.delete(actualKey);
  }
}

/**
 * 创建默认速率限制器
 */
export function createRateLimiter(config?: Partial<RateLimiterConfig>): RateLimiter {
  return new RateLimiter({
    maxRequests: config?.maxRequests || 100,
    windowMs: config?.windowMs || 60000,
    keyGenerator: config?.keyGenerator,
  });
}

/**
 * 创建默认令牌桶限制器
 */
export function createTokenBucketLimiter(config?: {
  maxTokens?: number;
  refillRate?: number;
  keyGenerator?: () => string;
}): TokenBucketRateLimiter {
  return new TokenBucketRateLimiter({
    maxTokens: config?.maxTokens || 100,
    refillRate: config?.refillRate || 10,
    keyGenerator: config?.keyGenerator,
  });
}
