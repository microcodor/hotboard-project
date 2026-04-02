/**
 * 缓存管理模块
 * 提供内存缓存实现，支持 TTL、LRU 淘汰策略、缓存失效和预热
 */

import { appConfig } from './config';
import { CacheError, ErrorCode } from './errors';

/**
 * 缓存项
 */
interface CacheItem<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
  tags?: Set<string>;
}

/**
 * 缓存统计
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

/**
 * 缓存预热配置
 */
export interface CacheWarmConfig {
  key: string;
  factory: () => Promise<any>;
  ttl?: number;
  tags?: string[];
}

/**
 * 内存缓存类
 * 实现 LRU（最近最少使用）淘汰策略
 */
export class MemoryCache<T = any> {
  private cache: Map<string, CacheItem<T>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private maxSize: number;
  private defaultTtl: number;
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(maxSize?: number, defaultTtl?: number) {
    this.maxSize = maxSize || appConfig.cache.maxSize;
    this.defaultTtl = defaultTtl || appConfig.cache.ttl;
  }

  /**
   * 获取缓存
   */
  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.removeFromTagIndex(key);
      this.stats.misses++;
      return null;
    }

    // 更新访问时间
    item.lastAccessed = Date.now();
    this.stats.hits++;
    
    return item.value;
  }

  /**
   * 设置缓存
   */
  set(key: string, value: T, ttl?: number, tags?: string[]): void {
    // 如果达到最大容量，淘汰最旧的项
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const expiresAt = Date.now() + (ttl || this.defaultTtl) * 1000;
    const tagSet = tags ? new Set(tags) : undefined;
    
    this.cache.set(key, {
      value,
      expiresAt,
      lastAccessed: Date.now(),
      tags: tagSet,
    });

    // 更新标签索引
    if (tags) {
      for (const tag of tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(key);
      }
    }
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    this.removeFromTagIndex(key);
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * 检查键是否存在
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.removeFromTagIndex(key);
      return false;
    }

    return true;
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * 淘汰最近最少使用的项
   */
  private evictLRU(): void {
    let oldest: { key: string; lastAccessed: number } | null = null;

    for (const [key, item] of this.cache.entries()) {
      if (!oldest || item.lastAccessed < oldest.lastAccessed) {
        oldest = { key, lastAccessed: item.lastAccessed };
      }
    }

    if (oldest) {
      this.delete(oldest.key);
    }
  }

  /**
   * 清理过期项
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * 按标签失效缓存
   */
  invalidateByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys) {
      return 0;
    }

    let removed = 0;
    for (const key of keys) {
      if (this.delete(key)) {
        removed++;
      }
    }

    this.tagIndex.delete(tag);
    return removed;
  }

  /**
   * 按标签列表失效缓存
   */
  invalidateByTags(tags: string[]): number {
    let removed = 0;
    for (const tag of tags) {
      removed += this.invalidateByTag(tag);
    }
    return removed;
  }

  /**
   * 从标签索引中移除键
   */
  private removeFromTagIndex(key: string): void {
    const item = this.cache.get(key);
    if (item?.tags) {
      for (const tag of item.tags) {
        const keys = this.tagIndex.get(tag);
        if (keys) {
          keys.delete(key);
          if (keys.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      }
    }
  }

  /**
   * 预热缓存
   */
  async warm(configs: CacheWarmConfig[]): Promise<number> {
    let warmed = 0;
    for (const config of configs) {
      try {
        const value = await config.factory();
        this.set(config.key, value, config.ttl, config.tags);
        warmed++;
      } catch (error) {
        console.error(`缓存预热失败: ${config.key}`, error);
      }
    }
    return warmed;
  }
}

/**
 * 装饰器：自动缓存函数结果
 */
export function Cached(ttl?: number, tags?: string[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const cache = new MemoryCache();

    descriptor.value = async function (...args: any[]) {
      // 生成缓存键
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;

      // 检查缓存
      const cached = cache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // 执行原方法
      const result = await originalMethod.apply(this, args);

      // 存入缓存
      cache.set(cacheKey, result, ttl, tags);

      return result;
    };

    return descriptor;
  };
}

/**
 * 全局缓存实例
 */
let globalCache: MemoryCache | null = null;

/**
 * 获取全局缓存实例
 */
export function getCache<T = any>(): MemoryCache<T> {
  if (!globalCache) {
    globalCache = new MemoryCache();
  }
  return globalCache;
}

/**
 * 缓存工具函数
 */
export const cacheUtils = {
  /**
   * 获取或设置缓存
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
    tags?: string[]
  ): Promise<T> {
    const cache = getCache<T>();
    
    // 尝试从缓存获取
    const cached = cache.get(key);
    if (cached !== null) {
      return cached;
    }

    // 执行工厂函数
    const value = await factory();
    
    // 存入缓存
    cache.set(key, value, ttl, tags);
    
    return value;
  },

  /**
   * 批量获取缓存
   */
  multiGet<T>(keys: string[]): Map<string, T | null> {
    const cache = getCache<T>();
    const result = new Map<string, T | null>();

    keys.forEach(key => {
      result.set(key, cache.get(key));
    });

    return result;
  },

  /**
   * 批量设置缓存
   */
  multiSet<T>(items: Map<string, T>, ttl?: number, tags?: string[]): void {
    const cache = getCache<T>();
    
    items.forEach((value, key) => {
      cache.set(key, value, ttl, tags);
    });
  },

  /**
   * 删除匹配的键
   */
  deletePattern(pattern: string): number {
    const cache = getCache();
    const regex = new RegExp(pattern);
    let removed = 0;

    cache.keys().forEach(key => {
      if (regex.test(key)) {
        cache.delete(key);
        removed++;
      }
    });

    return removed;
  },

  /**
   * 按标签失效缓存
   */
  invalidateByTag(tag: string): number {
    const cache = getCache();
    return cache.invalidateByTag(tag);
  },

  /**
   * 按标签列表失效缓存
   */
  invalidateByTags(tags: string[]): number {
    const cache = getCache();
    return cache.invalidateByTags(tags);
  },

  /**
   * 清理过期项
   */
  cleanup(): number {
    const cache = getCache();
    return cache.cleanup();
  },

  /**
   * 预热缓存
   */
  async warm(configs: CacheWarmConfig[]): Promise<number> {
    const cache = getCache();
    return cache.warm(configs);
  },

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    const cache = getCache();
    return cache.getStats();
  },
};

/**
 * 创建缓存实例
 */
export function createCache<T = any>(
  maxSize?: number,
  defaultTtl?: number
): MemoryCache<T> {
  return new MemoryCache<T>(maxSize, defaultTtl);
}
