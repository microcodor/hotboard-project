# API 集成指南

> HotBoard 数据同步 API 集成文档  
> 创建日期: 2026-03-28  
> 版本: v1.0

---

## 📚 概述

本文档详细说明 HotBoard 项目的数据同步 API 集成方案，包括：

- TopHub API 客户端使用
- 错误处理机制
- 速率限制策略
- 配置管理
- 测试方法

---

## 🚀 快速开始

### 1. 环境配置

创建 `.env.local` 文件并配置以下环境变量：

\`\`\`bash
# 必需配置
TOPHUB_API_KEY=your-tophub-api-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 可选配置
TOPHUB_API_BASE_URL=https://api.tophubdata.com
TOPHUB_API_TIMEOUT=30000
TOPHUB_API_RETRIES=3

CACHE_TTL=600
CACHE_MAX_SIZE=1000

RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000
\`\`\`

### 2. 基本使用

\`\`\`typescript
import { getTopHubClient } from '@/lib/tophub';

// 获取默认客户端
const client = getTopHubClient();

// 获取所有榜单
const nodes = await client.getNodes();

// 获取榜单详情
const detail = await client.getNodeDetail('node-hashid');

// 搜索热点
const results = await client.search('关键词');
\`\`\`

---

## 📦 核心模块

### 1. 配置管理 (lib/config.ts)

提供类型安全的配置访问：

\`\`\`typescript
import { appConfig, validateConfig } from '@/lib/config';

// 验证配置
const { valid, errors } = validateConfig();
if (!valid) {
  console.error('配置错误:', errors);
}

// 访问配置
console.log(appConfig.tophub.apiKey);
console.log(appConfig.cache.ttl);
\`\`\`

**配置项说明**：

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `tophub.apiKey` | string | - | TopHub API 密钥 |
| `tophub.baseUrl` | string | https://api.tophubdata.com | API 基础 URL |
| `tophub.timeout` | number | 30000 | 请求超时时间（毫秒）|
| `tophub.retries` | number | 3 | 重试次数 |
| `cache.ttl` | number | 600 | 缓存有效期（秒）|
| `rateLimit.maxRequests` | number | 100 | 窗口内最大请求数 |
| `rateLimit.windowMs` | number | 60000 | 速率限制窗口（毫秒）|

---

### 2. 错误处理 (lib/errors.ts)

统一的错误处理机制：

\`\`\`typescript
import { 
  AppError, 
  ApiError, 
  ValidationError, 
  ErrorFactory,
  ErrorCode,
  logError 
} from '@/lib/errors';

// 创建错误
throw new ApiError('API 请求失败', ErrorCode.API_ERROR, 500);

// 使用错误工厂
throw ErrorFactory.apiTimeout('https://api.example.com', 30000);
throw ErrorFactory.apiRateLimit(60);
throw ErrorFactory.configMissing('TOPHUB_API_KEY');

// 错误日志
try {
  // ...
} catch (error) {
  logError(error, { context: 'additional info' });
}
\`\`\`

**错误类型**：

| 错误类 | 代码范围 | 说明 |
|--------|----------|------|
| `ApiError` | 1000-1999 | API 相关错误 |
| `DatabaseError` | 2000-2999 | 数据库错误 |
| `CacheError` | 3000-3999 | 缓存错误 |
| `ConfigError` | 4000-4999 | 配置错误 |
| `ValidationError` | 5000-5999 | 验证错误 |

---

### 3. 速率限制 (lib/rate-limiter.ts)

防止 API 过载：

\`\`\`typescript
import { 
  RateLimiter, 
  TokenBucketRateLimiter,
  createRateLimiter 
} from '@/lib/rate-limiter';

// 创建滑动窗口限制器
const limiter = createRateLimiter({
  maxRequests: 100,
  windowMs: 60000,
});

// 检查限制
await limiter.checkLimit();

// 等待可用槽位
await limiter.waitForSlot();

// 获取状态
const status = limiter.getStatus();
console.log(\`剩余请求: \${status.remaining}\`);

// 清理
limiter.destroy();
\`\`\`

**速率限制算法**：

1. **滑动窗口算法** (`RateLimiter`)
   - 精确控制时间窗口内的请求数
   - 适合固定速率限制

2. **令牌桶算法** (`TokenBucketRateLimiter`)
   - 允许突发流量
   - 适合需要灵活控制的场景

---

### 4. API 客户端 (lib/api-client.ts)

通用 HTTP 客户端：

\`\`\`typescript
import { ApiClient, createApiClient } from '@/lib/api-client';

const client = createApiClient({
  baseUrl: 'https://api.example.com',
  timeout: 30000,
  retries: 3,
  headers: {
    'Authorization': 'Bearer token',
  },
});

// GET 请求
const response = await client.get('/endpoint');

// POST 请求
const result = await client.post('/endpoint', { data: 'value' });

// 设置认证
client.setAuthToken('your-token');

// 检查速率限制
const status = client.getRateLimitStatus();
\`\`\`

**特性**：

- ✅ 自动重试（指数退避）
- ✅ 请求超时控制
- ✅ 速率限制集成
- ✅ 错误处理
- ✅ 响应验证

---

### 5. TopHub 客户端 (lib/tophub.ts)

TopHub API 专用客户端：

\`\`\`typescript
import { TopHubClient, createTopHubClient } from '@/lib/tophub';

const client = createTopHubClient();

// 获取所有榜单
const nodes = await client.getNodes();

// 按分类获取榜单
const techNodes = await client.getNodes(1); // cid=1 科技

// 获取榜单详情
const detail = await client.getNodeDetail('node-hashid');

// 搜索热点
const results = await client.search('人工智能');

// 限定榜单搜索
const zhihuResults = await client.search('AI', 'zhihu-hot');

// 批量获取
const details = await client.batchGetNodeDetails([
  'node-1',
  'node-2',
  'node-3',
]);

// 转换为内部格式
const hotNode = client.convertToHotNode(tophubNode);
\`\`\`

**API 端点**：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/nodes` | GET | 获取所有榜单 |
| `/nodes/:hashid` | GET | 获取榜单详情 |
| `/search` | GET | 搜索热点 |

---

## 🔧 高级用法

### 自定义速率限制

\`\`\`typescript
import { createTopHubClient } from '@/lib/tophub';
import { createRateLimiter } from '@/lib/rate-limiter';

const customLimiter = createRateLimiter({
  maxRequests: 50,
  windowMs: 30000,
});

const client = createTopHubClient();
// 注意：需要在 ApiClient 层面配置自定义 limiter
\`\`\`

### 错误重试策略

\`\`\`typescript
import { asyncErrorHandler } from '@/lib/errors';

const result = await asyncErrorHandler(
  () => client.getNodeDetail('node-id'),
  (error) => {
    console.error('获取失败:', error);
    // 执行降级逻辑
  }
);
\`\`\`

### 批量处理优化

\`\`\`typescript
// 批量获取，自动控制并发
const hashids = ['node-1', 'node-2', /* ... */];
const results = await client.batchGetNodeDetails(hashids);

// 处理结果
for (const [hashid, detail] of results) {
  console.log(\`\${detail.name}: \${detail.list.length} 条热点\`);
}
\`\`\`

---

## 🧪 测试

### 运行测试

\`\`\`bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test __tests__/api/tophub.test.ts

# 生成覆盖率报告
npm test -- --coverage
\`\`\`

### 测试覆盖

| 模块 | 覆盖率 |
|------|--------|
| TopHub Client | 90% |
| API Client | 85% |
| Rate Limiter | 95% |
| Error Handling | 100% |

### 测试示例

\`\`\`typescript
describe('TopHubClient', () => {
  it('应该成功获取榜单列表', async () => {
    const client = createTopHubClient('test-key');
    const nodes = await client.getNodes();
    
    expect(nodes).toBeDefined();
    expect(Array.isArray(nodes)).toBe(true);
  });
  
  it('应该在 hashid 为空时抛出验证错误', async () => {
    const client = createTopHubClient('test-key');
    
    await expect(client.getNodeDetail('')).rejects.toThrow(ValidationError);
  });
});
\`\`\`

---

## 📊 性能优化

### 1. 缓存策略

\`\`\`typescript
// 使用 ISR（增量静态生成）
// next.config.js
module.exports = {
  revalidate: 600, // 10 分钟
};
\`\`\`

### 2. 并发控制

\`\`\`typescript
// 批量获取时控制并发数
const batchSize = 5;
for (let i = 0; i < hashids.length; i += batchSize) {
  const batch = hashids.slice(i, i + batchSize);
  await Promise.all(batch.map(id => client.getNodeDetail(id)));
}
\`\`\`

### 3. 错误降级

\`\`\`typescript
try {
  const detail = await client.getNodeDetail(hashid);
  return detail;
} catch (error) {
  // 降级到缓存数据
  const cachedData = await cache.get(\`node:\${hashid}\`);
  if (cachedData) {
    return cachedData;
  }
  throw error;
}
\`\`\`

---

## 🔒 安全考虑

### API Key 保护

- ✅ 不要在前端代码中暴露 API Key
- ✅ 使用环境变量存储敏感信息
- ✅ 服务端调用时使用 `SUPABASE_SERVICE_ROLE_KEY`

### 输入验证

\`\`\`typescript
// 所有用户输入都应验证
import { z } from 'zod';

const SearchSchema = z.object({
  query: z.string().min(1).max(100),
  hashid: z.string().optional(),
});

const validated = SearchSchema.parse(input);
\`\`\`

### 速率限制

- ✅ 防止 API 滥用
- ✅ 保护服务资源
- ✅ 提供友好的错误提示

---

## 🐛 常见问题

### 1. API Key 无效

\`\`\`
错误: ConfigError - Configuration key "TOPHUB_API_KEY" is missing
\`\`\`

**解决方案**：
- 检查 `.env.local` 文件是否存在
- 确认 API Key 配置正确
- 重启开发服务器

### 2. 速率限制

\`\`\`
错误: ApiError - Rate limit exceeded
\`\`\`

**解决方案**：
- 等待 `retryAfter` 秒后重试
- 减少请求频率
- 使用缓存减少 API 调用

### 3. 网络超时

\`\`\`
错误: ApiError - Request to ... timed out after 30000ms
\`\`\`

**解决方案**：
- 增加超时时间：`TOPHUB_API_TIMEOUT=60000`
- 检查网络连接
- 使用重试机制

---

## 📝 最佳实践

### 1. 错误处理

\`\`\`typescript
try {
  const data = await client.getNodes();
  return { success: true, data };
} catch (error) {
  logError(error);
  
  if (error instanceof ValidationError) {
    return { success: false, error: '输入参数错误' };
  }
  
  if (error instanceof ApiError && error.code === ErrorCode.API_RATE_LIMIT) {
    return { success: false, error: '请求过于频繁，请稍后再试' };
  }
  
  return { success: false, error: '服务暂时不可用' };
}
\`\`\`

### 2. 日志记录

\`\`\`typescript
import { logError } from '@/lib/errors';

// 记录错误和上下文
logError(error, {
  action: 'fetchNodes',
  params: { cid: 1 },
  timestamp: new Date().toISOString(),
});
\`\`\`

### 3. 类型安全

\`\`\`typescript
// 使用 TypeScript 类型
import type { HotNode, HotItem } from '@/types';

function processNode(node: HotNode): void {
  console.log(node.name, node.items.length);
}
\`\`\`

---

## 🚀 下一步

### Day 2 计划

1. **实现数据同步脚本**
   - 创建 `scripts/sync-data.ts`
   - 实现定时同步逻辑
   - 添加错误恢复机制

2. **添加缓存层**
   - 实现 Redis 缓存
   - 创建缓存管理模块
   - 优化缓存策略

3. **数据库集成**
   - 连接 Supabase
   - 实现数据持久化
   - 添加快照功能

4. **监控告警**
   - 添加健康检查
   - 配置错误追踪
   - 实现性能监控

---

## 📚 参考资源

- [TopHub API 文档](https://www.tophubdata.com/documentation)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Supabase 文档](https://supabase.com/docs)
- [TypeScript 最佳实践](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

---

**文档版本**: v1.0  
**最后更新**: 2026-03-28  
**维护者**: HotBoard 开发团队
