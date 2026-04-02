/**
 * API 集成测试
 * 测试搜索、用户资料、收藏 API
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock 数据
const mockUserId = 'test-user-123';
const mockToken = 'Bearer test-token-123';
const mockNodeHashid = 'node-001';
const mockNodeHashid2 = 'node-002';

/**
 * 搜索 API 测试
 */
describe('搜索 API', () => {
  describe('GET /api/search', () => {
    it('应该返回搜索结果', async () => {
      const response = await fetch('/api/search?q=热点&page=1&pageSize=20', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.items).toBeInstanceOf(Array);
      expect(data.data.total).toBeGreaterThanOrEqual(0);
      expect(data.data.page).toBe(1);
      expect(data.data.pageSize).toBe(20);
      expect(data.data.hasMore).toBeDefined();
    });

    it('应该支持分页', async () => {
      const response1 = await fetch('/api/search?q=热点&page=1&pageSize=10', {
        method: 'GET',
      });
      const data1 = await response1.json();

      const response2 = await fetch('/api/search?q=热点&page=2&pageSize=10', {
        method: 'GET',
      });
      const data2 = await response2.json();

      expect(data1.data.items).not.toEqual(data2.data.items);
    });

    it('应该支持排序', async () => {
      const responsesRelevance = await fetch('/api/search?q=热点&sortBy=relevance', {
        method: 'GET',
      });
      const dataRelevance = await responsesRelevance.json();

      const responseHot = await fetch('/api/search?q=热点&sortBy=hot', {
        method: 'GET',
      });
      const dataHot = await responseHot.json();

      expect(dataRelevance.success).toBe(true);
      expect(dataHot.success).toBe(true);
    });

    it('应该在缺少查询参数时返回错误', async () => {
      const response = await fetch('/api/search', {
        method: 'GET',
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('应该在查询过长时返回错误', async () => {
      const longQuery = 'a'.repeat(101);
      const response = await fetch(`/api/search?q=${longQuery}`, {
        method: 'GET',
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('已登录用户应该看到收藏状态', async () => {
      const response = await fetch('/api/search?q=热点', {
        method: 'GET',
        headers: {
          'Authorization': mockToken,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      // 检查是否包含 is_favorited 字段
      if (data.data.items.length > 0) {
        expect('is_favorited' in data.data.items[0]).toBe(true);
      }
    });

    it('应该缓存搜索结果', async () => {
      const response1 = await fetch('/api/search?q=热点', {
        method: 'GET',
      });
      const data1 = await response1.json();

      const response2 = await fetch('/api/search?q=热点', {
        method: 'GET',
      });
      const data2 = await response2.json();

      expect(data1.data.items).toEqual(data2.data.items);
    });
  });
});

/**
 * 用户资料 API 测试
 */
describe('用户资料 API', () => {
  describe('GET /api/user/profile', () => {
    it('应该返回用户资料', async () => {
      const response = await fetch('/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': mockToken,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.id).toBeDefined();
      expect(data.data.email).toBeDefined();
      expect(data.data.favorites).toBeInstanceOf(Array);
    });

    it('未认证用户应该返回 401', async () => {
      const response = await fetch('/api/user/profile', {
        method: 'GET',
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('无效 token 应该返回 401', async () => {
      const response = await fetch('/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      });

      expect(response.status).toBe(401);
    });

    it('应该缓存用户资料', async () => {
      const response1 = await fetch('/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': mockToken,
        },
      });
      const data1 = await response1.json();

      const response2 = await fetch('/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': mockToken,
        },
      });
      const data2 = await response2.json();

      expect(data1.data).toEqual(data2.data);
    });
  });

  describe('PUT /api/user/profile', () => {
    it('应该更新用户资料', async () => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': mockToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: '新用户名',
          bio: '这是我的个人简介',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.display_name).toBe('新用户名');
      expect(data.data.bio).toBe('这是我的个人简介');
    });

    it('应该验证 display_name 长度', async () => {
      const longName = 'a'.repeat(51);
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': mockToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: longName,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('应该验证 bio 长度', async () => {
      const longBio = 'a'.repeat(501);
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': mockToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bio: longBio,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('应该拒绝无效的字段', async () => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': mockToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 'new-id',
          created_at: '2024-01-01',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('未认证用户应该返回 401', async () => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: '新用户名',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('应该清除缓存', async () => {
      // 先获取一次以缓存
      await fetch('/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': mockToken,
        },
      });

      // 更新资料
      const updateResponse = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': mockToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: '更新后的名称',
        }),
      });

      expect(updateResponse.status).toBe(200);

      // 再次获取应该得到最新数据
      const getResponse = await fetch('/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': mockToken,
        },
      });

      const data = await getResponse.json();
      expect(data.data.display_name).toBe('更新后的名称');
    });
  });
});

/**
 * 收藏 API 测试
 */
describe('收藏 API', () => {
  describe('GET /api/favorites', () => {
    it('应该返回收藏列表', async () => {
      const response = await fetch('/api/favorites', {
        method: 'GET',
        headers: {
          'Authorization': mockToken,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.items).toBeInstanceOf(Array);
      expect(data.data.total).toBeGreaterThanOrEqual(0);
      expect(data.data.page).toBe(1);
      expect(data.data.hasMore).toBeDefined();
    });

    it('应该支持分页', async () => {
      const response1 = await fetch('/api/favorites?page=1&pageSize=10', {
        method: 'GET',
        headers: {
          'Authorization': mockToken,
        },
      });
      const data1 = await response1.json();

      const response2 = await fetch('/api/favorites?page=2&pageSize=10', {
        method: 'GET',
        headers: {
          'Authorization': mockToken,
        },
      });
      const data2 = await response2.json();

      expect(data1.data.page).toBe(1);
      expect(data2.data.page).toBe(2);
    });

    it('未认证用户应该返回 401', async () => {
      const response = await fetch('/api/favorites', {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/favorites', () => {
    it('应该添加收藏', async () => {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Authorization': mockToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeHashid: mockNodeHashid,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('应该验证 nodeHashid 参数', async () => {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Authorization': mockToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('应该验证榜单是否存在', async () => {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Authorization': mockToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeHashid: 'non-existent-node',
        }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('未认证用户应该返回 401', async () => {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeHashid: mockNodeHashid,
        }),
      });

      expect(response.status).toBe(401);
    });

    it('应该清除缓存', async () => {
      // 添加收藏
      const addResponse = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Authorization': mockToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeHashid: mockNodeHashid2,
        }),
      });

      expect(addResponse.status).toBe(200);

      // 获取收藏列表应该包含新添加的
      const getResponse = await fetch('/api/favorites', {
        method: 'GET',
        headers: {
          'Authorization': mockToken,
        },
      });

      const data = await getResponse.json();
      const hashids = data.data.items.map((item: any) => item.hashid);
      expect(hashids).toContain(mockNodeHashid2);
    });
  });

  describe('DELETE /api/favorites', () => {
    it('应该删除收藏', async () => {
      // 先添加收藏
      await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Authorization': mockToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeHashid: mockNodeHashid,
        }),
      });

      // 删除收藏
      const response = await fetch(`/api/favorites?nodeHashid=${mockNodeHashid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': mockToken,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('应该验证 nodeHashid 参数', async () => {
      const response = await fetch('/api/favorites', {
        method: 'DELETE',
        headers: {
          'Authorization': mockToken,
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('未认证用户应该返回 401', async () => {
      const response = await fetch(`/api/favorites?nodeHashid=${mockNodeHashid}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(401);
    });

    it('应该清除缓存', async () => {
      // 先添加收藏
      await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Authorization': mockToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeHashid: mockNodeHashid,
        }),
      });

      // 删除收藏
      const deleteResponse = await fetch(`/api/favorites?nodeHashid=${mockNodeHashid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': mockToken,
        },
      });

      expect(deleteResponse.status).toBe(200);

      // 获取收藏列表应该不包含已删除的
      const getResponse = await fetch('/api/favorites', {
        method: 'GET',
        headers: {
          'Authorization': mockToken,
        },
      });

      const data = await getResponse.json();
      const hashids = data.data.items.map((item: any) => item.hashid);
      expect(hashids).not.toContain(mockNodeHashid);
    });
  });
});

/**
 * 权限检查测试
 */
describe('权限检查', () => {
  it('应该拒绝无效的 token', async () => {
    const response = await fetch('/api/user/profile', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid-token',
      },
    });

    expect(response.status).toBe(401);
  });

  it('应该拒绝缺少 Authorization header', async () => {
    const response = await fetch('/api/user/profile', {
      method: 'GET',
    });

    expect(response.status).toBe(401);
  });

  it('应该拒绝错误的 Authorization 格式', async () => {
    const response = await fetch('/api/user/profile', {
      method: 'GET',
      headers: {
        'Authorization': 'InvalidFormat token',
      },
    });

    expect(response.status).toBe(401);
  });
});

/**
 * 错误处理测试
 */
describe('错误处理', () => {
  it('应该处理无效的 JSON', async () => {
    const response = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: {
        'Authorization': mockToken,
        'Content-Type': 'application/json',
      },
      body: 'invalid json',
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it('应该处理服务器错误', async () => {
    // 这个测试需要模拟数据库错误
    // 实际实现中应该使用 mock
  });
});
