# HotBoard 数据抓取改进计划

## 📊 当前状态分析

### ✅ 已成功抓取的平台 (5个)

| 平台 | 数据量 | 抓取方式 | 稳定性 |
|-----|--------|---------|--------|
| 百度热搜 | 50条 | API | ⭐⭐⭐⭐⭐ |
| B站热门 | 100条 | API | ⭐⭐⭐⭐⭐ |
| 豆瓣电影 | 20条 | HTML解析 | ⭐⭐⭐⭐ |
| 澎湃新闻 | 20条 | API | ⭐⭐⭐⭐ |
| Hacker News | 30条 | API | ⭐⭐⭐⭐⭐ |

### ❌ 待解决的平台 (7个)

| 平台 | 问题 | 难度 |
|-----|------|------|
| 微博热搜 | HTTP 403 (需要登录) | ⭐⭐⭐⭐ |
| 知乎热榜 | HTTP 403 (需要登录) | ⭐⭐⭐⭐ |
| 抖音热点 | HTTP 403 (需要登录) | ⭐⭐⭐⭐⭐ |
| 头条热榜 | API已变更 | ⭐⭐⭐ |
| 36氪热榜 | HTTP 500 | ⭐⭐ |
| 虎嗅热榜 | 返回非JSON | ⭐⭐ |
| 掘金热榜 | 数据结构变化 | ⭐⭐ |

---

## 🎯 解决方案

### 方案一：RSSHub (推荐)

RSSHub 是开源的 RSS 生成器，支持上千个网站，包括微博、知乎、抖音等。

**优点**：
- 开源免费，可自建服务
- 支持 2000+ 网站
- 社区活跃，持续更新
- 可生成标准 RSS 格式

**部署方式**：
```bash
# Docker 部署
docker run -d --name rsshub -p 1200:1200 diygod/rsshub

# 支持的平台路由：
# - 微博热搜: /weibo/search/hot
# - 知乎热榜: /zhihu/hotlist
# - 抖音热点: /douyin/trending
# - 头条热榜: /toutiao/hot
# - 36氪: /36kr/newsflashes
# - 虎嗅: /huxiu/article
# - 掘金: /juejin/trending
```

**实现代码**：
```typescript
// lib/crawler/rsshub-source.ts
const RSSHUB_URL = 'http://localhost:1200';

async function fetchFromRSSHub(route: string) {
  const response = await fetch(`${RSSHUB_URL}${route}`);
  const text = await response.text();
  // 解析 RSS XML
  return parseRSS(text);
}

// 使用示例
const weiboHot = await fetchFromRSSHub('/weibo/search/hot');
const zhihuHot = await fetchFromRSSHub('/zhihu/hotlist');
```

---

### 方案二：Puppeteer 无头浏览器

对于需要登录的平台，使用 Puppeteer 模拟真实用户行为。

**优点**：
- 可以绑过登录限制
- 模拟真实浏览器行为
- 支持复杂页面交互

**缺点**：
- 资源消耗大
- 速度较慢
- 可能被检测

**实现代码**：
```typescript
// lib/crawler/puppeteer-source.ts
import puppeteer from 'puppeteer';

async function crawlWithPuppeteer(url: string, selector: string) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0...');
  await page.goto(url, { waitUntil: 'networkidle2' });
  
  const items = await page.$$eval(selector, elements => 
    elements.map(el => ({
      title: el.textContent,
      url: el.querySelector('a')?.href
    }))
  );
  
  await browser.close();
  return items;
}

// 使用示例
const weiboHot = await crawlWithPuppeteer(
  'https://s.weibo.com/top/summary',
  '.td-02 a'
);
```

---

### 方案三：第三方聚合 API

使用第三方提供的聚合 API。

**免费 API**：
1. **天行数据** - 提供50+平台热榜API
   - 官网: https://www.tianapi.com
   - 免费额度: 100次/天
   
2. **韩小韩 API** - 免费热榜聚合
   - 官网: https://api.vvhan.com
   - 支持平台: 微博、知乎、抖音、头条等

3. **今日热榜 API** - 开源方案
   - GitHub: https://github.com/tophubs/to-be-slack
   - 支持自建

**实现代码**：
```typescript
// lib/crawler/third-party-api.ts

// 韩小韩 API (免费)
async function fetchFromVvhan(type: string) {
  const response = await fetch(`https://api.vvhan.com/api/hotlist/${type}`);
  const data = await response.json();
  return data.data;
}

// 支持类型:
// - wbHot (微博热搜)
// - zhihuHot (知乎热榜)
// - douyinHot (抖音热点)
// - toutiaoHot (头条热榜)
// - bili (B站热门)
// - weibo (微博热搜)
```

---

### 方案四：Playwright 自动化

比 Puppeteer 更现代的浏览器自动化工具。

**优点**：
- 更快的执行速度
- 更好的浏览器支持
- 自动等待机制

---

## 📋 实施计划

### 阶段一：快速接入 (今晚完成)

1. **集成韩小韩 API** (最简单，立即可用)
   - 微博热搜 ✅
   - 知乎热榜 ✅
   - 抖音热点 ✅
   - 头条热榜 ✅

2. **修复现有抓取器**
   - 36氪：更新 API 地址
   - 掘金：更新数据结构
   - 虎嗅：改用 HTML 解析

### 阶段二：自建 RSSHub (明天完成)

1. **Docker 部署 RSSHub**
2. **创建 RSS 解析器**
3. **添加更多平台支持**

### 阶段三：Puppeteer 备用方案 (后天完成)

1. **部署无头浏览器服务**
2. **实现登录态管理**
3. **添加反爬虫策略**

---

## 🚀 立即执行

我将立即执行阶段一：
1. 集成韩小韩免费 API
2. 修复现有抓取器
3. 创建统一的抓取调度器
