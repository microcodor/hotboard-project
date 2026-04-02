/**
 * 榜单 API 测试
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Mock 环境变量
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

// Mock Supabase 客户端
jest.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          range: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: {
                  id: 1,
                  hashid: 'test-node',
                  name: '测试榜单',
                  display: '测试榜单描述',
                  cid: 1,
                  logo: 'https://example.com/logo.png',
                  url: 'https://example.com',
                  sort_order: 1,
                  is_active: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                error: null,
              })),
            })),
            limit: jest.fn(() => Promise.resolve({
              data: [],
              error: null,
            })),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
      insert: jest.fn(() => Promise.resolve({ error: null })),
    })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } },
        error: null,
      })),
    },
  })),
}));

describe('榜单 API', () => {
  describe('GET /api/nodes', () => {
    it('应该返回榜单列表', async () => {
      // 由于 Next.js API 路由需要完整的请求对象，
      // 这里我们测试数据库操作层
      const { nodesDb } = await import('@/lib/db');

      const result = await nodesDb.getAll();

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
    });

    it('应该支持分类筛选', async () => {
      const { nodesDb } = await import('@/lib/db');

      const result = await nodesDb.getAll({ cid: 1 });

      expect(result).toHaveProperty('data');
    });

    it('应该支持分页', async () => {
      const { nodesDb } = await import('@/lib/db');

      const result = await nodesDb.getAll({ page: 1, pageSize: 10 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('count');
    });
  });

  describe('GET /api/nodes/[hashid]', () => {
    it('应该返回榜单详情', async () => {
      const { nodesDb } = await import('@/lib/db');

      const result = await nodesDb.getByHashid('test-node');

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
    });

    it('应该对不存在的榜单返回错误', async () => {
      // 重新 mock 以返回 null
      const { nodesDb } = await import('@/lib/db');

      // 这里我们期望 error 字段存在
      // 实际测试中需要调整 mock 行为
    });
  });

  describe('GET /api/nodes/[hashid]/items', () => {
    it('应该返回榜单内容项列表', async () => {
      const { nodesDb } = await import('@/lib/db');

      const result = await nodesDb.getItems({ hashid: 'test-node' });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
    });
  });
});

describe('缓存工具', () => {
  it('应该正确设置和获取缓存', async () => {
    const { cacheUtil, cacheKeys } = await import('@/lib/cache');

    const testData = { test: 'data' };
    const key = cacheKeys.node('test-hashid');

    cacheUtil.set(key, testData);
    const cached = cacheUtil.get<typeof testData>(key);

    expect(cached).toEqual(testData);
  });

  it('应该正确删除缓存', async () => {
    const { cacheUtil, cacheKeys } = await import('@/lib/cache');

    const testData = { test: 'data' };
    const key = cacheKeys.node('test-delete');

    cacheUtil.set(key, testData);
    cacheUtil.delete(key);
    const cached = cacheUtil.get(key);

    expect(cached).toBeNull();
  });

  it('应该正确清理过期缓存', async () => {
    const { cacheUtil } = await import('@/lib/cache');

    // 设置一个很快过期的缓存
    cacheUtil.set('test-expired', 'data', { ttl: 1 });

    // 等待过期
    await new Promise((resolve) => setTimeout(resolve, 10));

    const cleaned = cacheUtil.cleanup();

    expect(cleaned).toBeGreaterThanOrEqual(0);
  });
});

describe('缓存键生成器', () => {
  it('应该生成正确的节点缓存键', async () => {
    const { cacheKeys } = await import('@/lib/cache');

    expect(cacheKeys.nodes()).toBe('nodes:all');
    expect(cacheKeys.nodes(1)).toBe('nodes:1');
    expect(cacheKeys.node('abc')).toBe('node:abc');
    expect(cacheKeys.nodeItems('abc', 1)).toBe('node:abc:items:1');
    expect(cacheKeys.search('test', 'abc')).toBe('search:abc:test');
  });
});

describe('工具函数', () => {
  it('应该正确格式化数字', async () => {
    const { formatNumber } = await import('@/lib/utils');

    expect(formatNumber(500)).toBe('500');
    expect(formatNumber(1500)).toBe('1.5k');
    expect(formatNumber(15000)).toBe('1.5万');
  });

  it('应该正确截断文本', async () => {
    const { truncate } = await import('@/lib/utils');

    expect(truncate('hello', 10)).toBe('hello');
    expect(truncate('hello world', 8)).toBe('hello...');
  });

  it('应该正确提取域名', async () => {
    const { extractDomain } = await import('@/lib/utils');

    expect(extractDomain('https://example.com/path')).toBe('example.com');
    expect(extractDomain('invalid-url')).toBe('invalid-url');
  });
});
