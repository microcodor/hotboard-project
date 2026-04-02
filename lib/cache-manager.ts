/**
 * 缓存管理模块 - Day 2 增强版
 * 功能：
 * - 缓存失效机制
 * - 缓存键设计优化
 * - 缓存预热
 * - 缓存统计监控
 */

import { appConfig } from './config';
import { createLogger } from './logger';

const logger = createLogger('cache-manager');

/**
 * 缓存项
 */
interface CacheItem<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
  accessCount: number;
  createdAt: number;
  tags: Set<string>;
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
  evictions: number;
  avgAccessCount: number;
}

/**
 * 缓存键生成器
 */
export class CacheKeyGenerator {
  /**
   * 生成节点列表缓存键
   */
  static nodesList(cid?: number): string {
    return cid ? `nodes:list:${cid}` : 'nodes:list:all';
  }

  /**
   * 生成节点详情缓存键
   */
  static nodeDetail(hashid: string): string {
    return `node:detail:${hashid}`;
  }

  /**
   * 生成节点项目缓存键
   */
  static nodeItems(hashid: string, page?: number): string {
    return page ? `node:items:${hashid}:${page}` : `node:items:${hashid}`;
  }

  /**
   * 生成搜索结果缓存键
   */
  static searchResults(query: string, page?: number): string {
    const key = `search:${query.toLowerCase()}`;
    return page ? `${key}:${page}` : key;
  }

  /**
   * 生成用户收藏缓存键
   */
  static userFavorites(userId: string): string {
    return `user:favorites:${userId}`;
  }

  /**
   * 生成分类列表缓存键
   */
  static categoriesList(): string {
    return 'categories:list';
  }

  /**
   * 生成热榜排行缓存键
   */
  static hotRanking(limit?: number): string {
    return limit ? `hot:ranking:${limit}` : 'hot:ranking:100';
  }
}

/**
 * 增强的内存缓存类
 */
export class EnhancedMemoryCache<T = any> {
  private cache: Map<string, CacheItem<T>> = new Map();
  private maxSize: number;
  private defaultTtl: number;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };
  private tagIndex: Map<string, Set<string>> = new Map();

  constructor(maxSize?: number, defaultTtl?: number) {
    this.maxSize = maxSize || appConfig.cache.maxSize;
    this.defaultTtl = defaultTtl || appConfig.cache.ttl;

    // 定期清理过期项
    this.startCleanupInterval();
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

    // 更新访问信息
    item.lastAccessed = Date.now();
    item.accessCount++;
    this.stats.hits++;

    logger.debug(`缓存命中: ${key}`);

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

    this.cache.set(key, {
      value,
      expiresAt,
      lastAccessed: Date.now(),
      accessCount: 0,
      createdAt: Date.now(),
      tags: new Set(tags || []),
    });

    // 更新标签索引
    if (tags) {
      tags.forEach((tag) => {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(key);
      });
    }

    logger.debug(`缓存设置: ${key} (TTL: ${ttl || this.defaultTtl}s)`);
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.removeFromTagIndex(key);
      logger.debug(`缓存删除: ${key}`);
    }
    return deleted;
  }

  /**
   * 按标签删除缓存
   */
  deleteByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys) {
      return 0;
    }

    let deleted = 0;
    keys.forEach((key) => {
      if (this.cache.delete(key)) {
        deleted++;
      }
    });

    this.tagIndex.delete(tag);
    logger.info(`按标签删除缓存: ${tag} (${deleted} 项)`);

    return deleted;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
    logger.info('缓存已清空');
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
    const accessCounts = Array.from(this.cache.values()).map(
      (item) => item.accessCount
    );
    const avgAccessCount =
      accessCounts.length > 0
        ? accessCounts.reduce((a, b) => a + b, 0) / accessCounts.length
        : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      avgAccessCount,
    };
  }

  /**
   * 预热缓存
   */
  async warmup<U>(
    keys: string[],
    factory: (key: string) => Promise<U>,
    ttl?: number,
    tags?: string[]
  ): Promise<number> {
    let warmed = 0;

    for (const key of keys) {
      try {
        const value = await factory(key);
        this.set(key, value as any, ttl, tags);
        warmed++;
      } catch (error) {
        logger.warn(`缓存预热失败: ${key}`, error);
      }
    }

    logger.info(`缓存预热完成: ${warmed}/${keys.length} 项`);
    return warmed;
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
      this.cache.delete(oldest.key);
      this.removeFromTagIndex(oldest.key);
      this.stats.evictions++;
      logger.debug(`缓存淘汰: ${oldest.key}`);
    }
  }

  /**
   * 从标签索引中移除
   */
  private removeFromTagIndex(key: string): void {
    const item = this.cache.get(key);
    if (item) {
      item.tags.forEach((tag) => {
        const keys = this.tagIndex.get(tag);
        if (keys) {
          keys.delete(key);
          if (keys.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      });
    }
  }

  /**
   * 清理过期项
   */
  private cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        this.removeFromTagIndex(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug(`清理过期缓存: ${removed} 项`);
    }

    return removed;
  }

  /**
   * 启动定期清理
   */
  private startCleanupInterval(): void {
    // 每 5 分钟清理一次过期项
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }
}

/**
 * 缓存工具函数
 */
export const cacheUtils = {
  /**
   * 获取或设置缓存
   */
  async getOrSet<T>(
    cache: EnhancedMemoryCache<T>,
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
    tags?: string[]
  ): Promise<T> {
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
  multiGet<T>(cache: EnhancedMemoryCache<T>, keys: string[]): Map<string, T | null> {
    const result = new Map<string, T | null>();

    keys.forEach((key) => {
      result.set(key, cache.get(key));
    });

    return result;
  },

  /**
   * 批量设置缓存
   */
  multiSet<T>(
    cache: EnhancedMemoryCache<T>,
    items: Map<string, T>,
    ttl?: number,
    tags?: string[]
  ): void {
    items.forEach((value, key) => {
      cache.set(key, value, ttl, tags);
    });
  },

  /**
   * 删除匹配的键
   */
  deletePattern(cache: EnhancedMemoryCache, pattern: string): number {
    const regex = new RegExp(pattern);
    let removed = 0;

    cache.keys().forEach((key) => {
      if (regex.test(key)) {
        cache.delete(key);
        removed++;
      }
    });

    return removed;
  },
};

/**
 * 全局缓存实例
 */
let globalCache: EnhancedMemoryCache | null = null;

/**
 * 获取全局缓存实例
 */
export function getCache<T = any>(): EnhancedMemoryCache<T> {
  if (!globalCache) {
    globalCache = new EnhancedMemoryCache();
  }
  return globalCache as EnhancedMemoryCache<T>;
}

/**
 * 创建缓存实例
 */
export function createCache<T = any>(
  maxSize?: number,
  defaultTtl?: number
): EnhancedMemoryCache<T> {
  return new EnhancedMemoryCache<T>(maxSize, defaultTtl);
}
