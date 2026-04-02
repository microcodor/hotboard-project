# HotBoard 自建数据抓取系统设计

## 目标

让 HotBoard 具备自主抓取各大平台热点的能力，不依赖第三方 API。

---

## 技术方案

### 方案一：服务端抓取（推荐）

**技术栈**：
- Puppeteer / Playwright - 无头浏览器抓取
- Cheerio - HTML 解析
- Node-cron - 定时任务
- Redis - 缓存和队列

**优点**：
- 完全自主可控
- 可以抓取动态渲染的页面
- 可以处理反爬措施

**缺点**：
- 需要更多服务器资源
- 需要维护抓取规则

---

### 方案二：Edge Functions 抓取

**技术栈**：
- Vercel Edge Functions / Cloudflare Workers
- 轻量级 HTTP 抓取

**优点**：
- 全球分布，速度快
- 无需维护服务器

**缺点**：
- 有执行时间限制
- 难以处理复杂反爬

---

## 支持的平台

### 第一批（简单，无反爬）

| 平台 | 抓取方式 | 难度 |
|-----|---------|------|
| 知乎热榜 | API/HTML | ⭐ 简单 |
| 微博热搜 | HTML | ⭐ 简单 |
| 百度热搜 | HTML | ⭐ 简单 |
| 抖音热点 | API | ⭐⭐ 中等 |
| B站热门 | API | ⭐ 简单 |
| 36氪 | HTML | ⭐ 简单 |
| 掘金热榜 | API | ⭐ 简单 |
| V2EX | HTML | ⭐ 简单 |
| Hacker News | API | ⭐ 简单 |

### 第二批（需要处理反爬）

| 平台 | 抓取方式 | 难度 |
|-----|---------|------|
| 今日头条 | Puppeteer | ⭐⭐⭐ 困难 |
| 小红书 | Puppeteer | ⭐⭐⭐ 困难 |
| 微信热文 | Puppeteer | ⭐⭐⭐ 困难 |

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     HotBoard 数据抓取系统                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   定时调度器   │───▶│   任务队列    │───▶│   抓取引擎    │  │
│  │  (node-cron)  │    │   (Redis)    │    │ (Puppeteer)  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                   │         │
│                                          ┌────────▼────────┐│
│                                          │   数据处理层    ││
│                                          │  - 去重         ││
│                                          │  - 清洗         ││
│                                          │  - 标准化       ││
│                                          └────────┬────────┘│
│                                                   │         │
│  ┌──────────────┐    ┌──────────────┐    ┌────────▼────────┐│
│  │   前端展示    │◀───│   API 层     │◀───│  PostgreSQL    ││
│  │  (Next.js)   │    │  (REST API)  │    │   数据存储      ││
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 实现步骤

### Step 1: 创建抓取引擎

```typescript
// lib/crawler/engine.ts
import puppeteer from 'puppeteer';

export class CrawlerEngine {
  private browser: puppeteer.Browser | null = null;
  
  async init() {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  
  async crawl(url: string, selector: string) {
    const page = await this.browser!.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.waitForSelector(selector);
    const data = await page.evaluate(() => { ... });
    await page.close();
    return data;
  }
}
```

### Step 2: 定义平台抓取规则

```typescript
// lib/crawler/platforms/zhihu.ts
export const zhihuRule = {
  name: '知乎热榜',
  url: 'https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total',
  type: 'api', // 或 'html'
  parser: (data: any) => {
    return data.data.map((item: any) => ({
      title: item.target.title,
      url: `https://www.zhihu.com/question/${item.target.id}`,
      hot: item.detail_text,
    }));
  }
};
```

### Step 3: 定时任务

```typescript
// lib/crawler/scheduler.ts
import cron from 'node-cron';

export function startScheduler() {
  // 每 10 分钟抓取一次
  cron.schedule('*/10 * * * *', async () => {
    await crawlAllPlatforms();
  });
}
```

---

## 利用 QClaw 能力

如果用户有 QClaw 环境，可以：

1. **QClaw 抓取 → 写入文件 → HotBoard 读取**
   - QClaw 定期抓取各平台热点
   - 写入 JSON 文件到指定目录
   - HotBoard API 监听文件变化并入库

2. **QClaw 抓取 → 直接入库**
   - QClaw 使用 PostgreSQL 客户端
   - 直接写入 HotBoard 数据库

3. **QClaw 抓取 → 调用 HotBoard API**
   - QClaw 抓取后调用 HotBoard 的 `/api/crawl/import` 接口
   - HotBoard 处理入库逻辑

---

## 下一步行动

1. **创建抓取引擎模块** (`lib/crawler/`)
2. **实现首批平台抓取规则** (知乎、微博、B站等)
3. **创建定时任务系统**
4. **添加数据去重和清洗逻辑**
5. **创建 QClaw 集成接口**

---

是否开始实现？
