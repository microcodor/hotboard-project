/**
 * TopHub API 集成测试
 */

import { TopHubClient, createTopHubClient } from '@/lib/tophub';
import { ErrorCode, AppError, ValidationError } from '@/lib/errors';
import { RateLimiter } from '@/lib/rate-limiter';

// Mock 环境变量
process.env.TOPHUB_API_KEY = 'test-api-key-12345';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock fetch
global.fetch = jest.fn();

describe('TopHubClient', () => {
  let client: TopHubClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = createTopHubClient('test-api-key');
  });

  describe('getNodes', () => {
    it('应该成功获取榜单列表', async () => {
      const mockResponse = {
        code: 0,
        data: {
          list: [
            {
              id: '1',
              hashid: 'node-1',
              name: '知乎热榜',
              url: 'https://www.zhihu.com',
              logo: 'https://example.com/logo.png',
              cid: 1,
              cname: '科技',
              sort_order: 1,
            },
          ],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      const nodes = await client.getNodes();

      expect(nodes).toHaveLength(1);
      expect(nodes[0].hashid).toBe('node-1');
      expect(nodes[0].name).toBe('知乎热榜');
    });

    it('应该支持按分类筛选', async () => {
      const mockResponse = {
        code: 0,
        data: { list: [] },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      await client.getNodes(1);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('cid=1'),
        expect.any(Object)
      );
    });

    it('应该正确处理 API 错误', async () => {
      const mockResponse = {
        code: 1001,
        message: 'API Key 无效',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
        json: async () => mockResponse,
      });

      await expect(client.getNodes()).rejects.toThrow();
    });
  });

  describe('getNodeDetail', () => {
    it('应该成功获取榜单详情', async () => {
      const mockResponse = {
        code: 0,
        data: {
          id: '1',
          hashid: 'node-1',
          name: '知乎热榜',
          url: 'https://www.zhihu.com',
          logo: 'https://example.com/logo.png',
          cid: 1,
          cname: '科技',
          sort_order: 1,
          list: [
            {
              id: 'item-1',
              title: '测试热点',
              url: 'https://example.com/item',
              hot_value: 1000,
            },
          ],
          update_time: '2026-03-28T10:00:00Z',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      const detail = await client.getNodeDetail('node-1');

      expect(detail.hashid).toBe('node-1');
      expect(detail.list).toHaveLength(1);
      expect(detail.list[0].title).toBe('测试热点');
    });

    it('应该在 hashid 为空时抛出验证错误', async () => {
      await expect(client.getNodeDetail('')).rejects.toThrow(ValidationError);
    });

    it('应该处理榜单不存在的情况', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        json: async () => ({}),
      });

      await expect(client.getNodeDetail('invalid-id')).rejects.toThrow();
    });
  });

  describe('search', () => {
    it('应该成功搜索热点', async () => {
      const mockResponse = {
        code: 0,
        data: {
          list: [
            {
              title: '搜索结果1',
              url: 'https://example.com/1',
              hot_value: 500,
              node_name: '知乎热榜',
              node_hashid: 'node-1',
            },
          ],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      const results = await client.search('测试关键词');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('搜索结果1');
    });

    it('应该支持限定榜单搜索', async () => {
      const mockResponse = {
        code: 0,
        data: { list: [] },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      await client.search('测试', 'node-1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('hashid=node-1'),
        expect.any(Object)
      );
    });

    it('应该在关键词为空时抛出验证错误', async () => {
      await expect(client.search('')).rejects.toThrow(ValidationError);
      await expect(client.search('   ')).rejects.toThrow(ValidationError);
    });
  });

  describe('convertToHotNode', () => {
    it('应该正确转换节点格式', () => {
      const tophubNode = {
        id: '1',
        hashid: 'node-1',
        name: '知乎热榜',
        url: 'https://www.zhihu.com',
        logo: 'https://example.com/logo.png',
        cid: 1,
        cname: '科技',
        sort_order: 1,
        display: '知乎每日热榜',
      };

      const hotNode = client.convertToHotNode(tophubNode);

      expect(hotNode.id).toBe('1');
      expect(hotNode.hashid).toBe('node-1');
      expect(hotNode.name).toBe('知乎热榜');
      expect(hotNode.description).toBe('知乎每日热榜');
      expect(hotNode.items).toEqual([]);
    });

    it('应该正确转换带热点的节点详情', () => {
      const tophubDetail = {
        id: '1',
        hashid: 'node-1',
        name: '知乎热榜',
        url: 'https://www.zhihu.com',
        logo: 'https://example.com/logo.png',
        cid: 1,
        cname: '科技',
        sort_order: 1,
        list: [
          {
            id: 'item-1',
            title: '热点标题',
            url: 'https://example.com/item',
            hot_value: 1000,
            extra: { author: '测试作者' },
          },
        ],
        update_time: '2026-03-28T10:00:00Z',
      };

      const hotNode = client.convertToHotNode(tophubDetail);

      expect(hotNode.items).toHaveLength(1);
      expect(hotNode.items[0].rank).toBe(1);
      expect(hotNode.items[0].hot_value).toBe(1000);
    });
  });

  describe('batchGetNodeDetails', () => {
    it('应该批量获取多个榜单', async () => {
      const mockResponses = [
        {
          code: 0,
          data: {
            id: '1',
            hashid: 'node-1',
            name: '榜单1',
            url: 'https://example.com/1',
            logo: 'https://example.com/logo1.png',
            cid: 1,
            cname: '科技',
            sort_order: 1,
            list: [],
            update_time: '2026-03-28T10:00:00Z',
          },
        },
        {
          code: 0,
          data: {
            id: '2',
            hashid: 'node-2',
            name: '榜单2',
            url: 'https://example.com/2',
            logo: 'https://example.com/logo2.png',
            cid: 1,
            cname: '科技',
            sort_order: 2,
            list: [],
            update_time: '2026-03-28T10:00:00Z',
          },
        },
      ];

      mockResponses.forEach((response) => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => response,
        });
      });

      const results = await client.batchGetNodeDetails(['node-1', 'node-2']);

      expect(results.size).toBe(2);
      expect(results.has('node-1')).toBe(true);
      expect(results.has('node-2')).toBe(true);
    });

    it('应该处理部分失败的情况', async () => {
      // 第一个成功
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          code: 0,
          data: {
            id: '1',
            hashid: 'node-1',
            name: '榜单1',
            url: 'https://example.com/1',
            logo: 'https://example.com/logo1.png',
            cid: 1,
            cname: '科技',
            sort_order: 1,
            list: [],
            update_time: '2026-03-28T10:00:00Z',
          },
        }),
      });

      // 第二个失败
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        json: async () => ({}),
      });

      const results = await client.batchGetNodeDetails(['node-1', 'node-2']);

      expect(results.size).toBe(1);
      expect(results.has('node-1')).toBe(true);
      expect(results.has('node-2')).toBe(false);
    });
  });
});

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      maxRequests: 3,
      windowMs: 1000,
    });
  });

  afterEach(() => {
    limiter.destroy();
  });

  it('应该允许在限制内的请求', async () => {
    await expect(limiter.checkLimit()).resolves.not.toThrow();
    await expect(limiter.checkLimit()).resolves.not.toThrow();
    await expect(limiter.checkLimit()).resolves.not.toThrow();
  });

  it('应该在超出限制时抛出错误', async () => {
    await limiter.checkLimit();
    await limiter.checkLimit();
    await limiter.checkLimit();

    await expect(limiter.checkLimit()).rejects.toThrow();
  });

  it('应该正确返回剩余请求数', async () => {
    const status1 = limiter.getStatus();
    expect(status1.remaining).toBe(3);

    await limiter.checkLimit();

    const status2 = limiter.getStatus();
    expect(status2.remaining).toBe(2);
  });

  it('应该支持重置', async () => {
    await limiter.checkLimit();
    await limiter.checkLimit();
    
    limiter.reset();

    const status = limiter.getStatus();
    expect(status.remaining).toBe(3);
  });
});

describe('Config', () => {
  it('应该正确加载配置', () => {
    const { appConfig } = require('@/lib/config');

    expect(appConfig.tophub.apiKey).toBe('test-api-key-12345');
    expect(appConfig.app.name).toBe('HotBoard');
  });
});
