# HotBoard API 接口文档

## 概述

HotBoard 提供 REST API 接口，支持获取热点新闻数据。

**基础地址**: `http://192.168.2.133:3000`

---

## 鉴权说明

### API Key 认证

所有对外接口均需要 API Key 鉴权。请在请求头中携带：

```
Authorization: Bearer <your_api_key>
```

获取 API Key：访问 `/user/billing` 页面创建。

### 限流策略

- 每个用户根据套餐有不同的请求限制
- 返回头包含限流信息：
  - `X-RateLimit-Limit`: 总限制次数
  - `X-RateLimit-Remaining`: 剩余次数
  - `X-RateLimit-Reset`: 重置时间

---

## 接口列表

### 1. 获取平台列表

获取所有支持的新闻平台列表。

**请求**
```
GET /api/platforms
```

**鉴权**: 必须

**参数**: 无

**响应示例**
```json
{
  "success": true,
  "data": [
    {
      "id": "people-hot",
      "name": "人民日报",
      "displayName": "人民日报",
      "category": "新闻",
      "url": "https://www.people.com.cn",
      "logo": null,
      "itemsCount": 30,
      "updatedAt": "2026-04-03T06:00:11.241Z"
    },
    {
      "id": "toutiao-hot",
      "name": "头条热榜",
      "displayName": "头条热榜",
      "category": "综合",
      "url": "https://www.toutiao.com",
      "logo": null,
      "itemsCount": 664,
      "updatedAt": "2026-04-03T06:00:06.144Z"
    }
  ],
  "total": 19,
  "rateLimit": {
    "limit": 500,
    "used": 0,
    "remaining": 499,
    "balance": 499,
    "resetAt": "2026-04-03T23:59:59+08:00"
  },
  "_auth": {
    "userId": 1,
    "keyName": "测试Key"
  }
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 平台唯一标识，用于查询热点 |
| name | string | 平台名称 |
| displayName | string | 平台显示名称 |
| category | string | 分类（新闻/综合/科技/视频等） |
| url | string | 平台官网地址 |
| logo | string | 平台 Logo URL（可能为 null） |
| itemsCount | number | 当前热点数量 |
| updatedAt | string | 最后更新时间（ISO 8601） |

---

### 2. 获取平台热点

根据平台 ID 获取该平台的热点列表。

**请求**
```
GET /api/platforms?platform=<hashid>&limit=<limit>&offset=<offset>
```

**鉴权**: 必须

**参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| platform | string | 是 | 平台 ID（从平台列表获取） |
| limit | number | 否 | 每页数量，默认 50，最大 100 |
| offset | number | 否 | 偏移量，用于分页，默认 0 |

**响应示例**
```json
{
  "success": true,
  "platform": {
    "id": "toutiao-hot",
    "name": "头条热榜",
    "displayName": "头条热榜",
    "category": "综合",
    "url": "https://www.toutiao.com",
    "logo": null
  },
  "data": [
    {
      "id": 7558,
      "title": "有线耳机被淘汰10年翻红 销量暴涨",
      "url": "https://www.toutiao.com/trending/7622897692520726582",
      "hotValue": "54630380",
      "hotText": "5463万",
      "rank": 1,
      "thumbnail": "",
      "description": "",
      "createdAt": "2026-04-03T06:00:04.114Z"
    }
  ],
  "total": 664,
  "limit": 50,
  "offset": 0,
  "hasMore": true,
  "rateLimit": {
    "limit": 500,
    "used": 1,
    "remaining": 498,
    "balance": 498,
    "resetAt": "2026-04-03T23:59:59+08:00"
  },
  "_auth": {
    "userId": 1,
    "keyName": "测试Key"
  }
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| platform | object | 平台信息 |
| data | array | 热点列表 |
| data[].id | number | 热点唯一 ID |
| data[].title | string | 标题 |
| data[].url | string | 原文链接 |
| data[].hotValue | string | 热度值 |
| data[].hotText | string | 热度文本（如"5463万"） |
| data[].rank | number | 排名 |
| data[].thumbnail | string | 缩略图 URL |
| data[].description | string | 摘要描述 |
| data[].createdAt | string | 抓取时间（ISO 8601） |
| total | number | 总数量 |
| hasMore | boolean | 是否有更多数据 |

---

### 3. 获取最新热点

按抓取时间倒序返回所有平台的最新热点（扁平列表）。

**请求**
```
GET /api/nodes?limit=<limit>&offset=<offset>
```

**鉴权**: 必须

**参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| limit | number | 否 | 每页数量，默认 20，最大 100 |
| offset | number | 否 | 偏移量，用于分页，默认 0 |

**响应示例**
```json
{
  "success": true,
  "data": [
    {
      "id": 1422,
      "title": "Show HN: Home Maker: Declare Your Dev Tools in a Makefile",
      "url": "https://thottingal.in/blog/2026/03/29/home-maker/",
      "hotValue": "0",
      "hotText": "0",
      "rank": 207,
      "thumbnail": "",
      "description": "",
      "createdAt": "2026-04-03T06:00:46.801Z",
      "platform": {
        "id": "hn-hot",
        "name": "Hacker News",
        "displayName": "Hacker News",
        "category": "科技",
        "url": null
      }
    }
  ],
  "total": 3842,
  "limit": 20,
  "offset": 0,
  "hasMore": true,
  "rateLimit": { ... },
  "_auth": { ... }
}
```

---

### 4. 获取最新热点（内部接口）

内部接口，供首页使用，无需鉴权。

**请求**
```
GET /api/news?limit=<limit>&offset=<offset>
```

**鉴权**: 不需要

**参数**: 同 `/api/nodes`

**响应**: 同 `/api/nodes`

---

## 支持的平台列表

| ID | 名称 | 分类 |
|----|------|------|
| people-hot | 人民日报 | 新闻 |
| tencent-hot | 腾讯新闻 | 新闻 |
| toutiao-hot | 头条热榜 | 综合 |
| douyin-hot | 抖音热点 | 视频 |
| baidu-hot | 百度热搜 | 综合 |
| weibo-hot | 微博热搜 | 综合 |
| zhihu-hot | 知乎热榜 | 综合 |
| bilibili-hot | B站热榜 | 视频 |
| thepaper-hot | 澎湃新闻 | 新闻 |
| netease-hot | 网易新闻 | 新闻 |
| sohu-hot | 搜狐新闻 | 新闻 |
| sina-hot | 新浪新闻 | 新闻 |
| 36kr-hot | 36氪 | 科技 |
| hacker-news | Hacker News | 科技 |
| github-trending | GitHub Trending | 科技 |
| v2ex-hot | V2EX | 科技 |
| juejin-hot | 掘金 | 科技 |
| segmentfault-hot | SegmentFault | 科技 |
| csdn-hot | CSDN | 科技 |

---

## 错误响应

### 401 未授权
```json
{
  "success": false,
  "error": "API Key required. Get your key at /user/billing"
}
```

### 404 平台不存在
```json
{
  "success": false,
  "error": "平台不存在"
}
```

### 429 请求过多
```json
{
  "success": false,
  "error": "今日免费次数已用完（100次/天），请注册账号或充值"
}
```

### 402 余额不足
```json
{
  "success": false,
  "error": "余额不足，请充值"
}
```

---

## 示例代码

### cURL
```bash
# 获取平台列表
curl -H "Authorization: Bearer your_api_key" \
  "http://192.168.2.133:3000/api/platforms"

# 获取头条热点（前10条）
curl -H "Authorization: Bearer your_api_key" \
  "http://192.168.2.133:3000/api/platforms?platform=toutiao-hot&limit=10"
```

### JavaScript (fetch)
```javascript
const API_KEY = 'your_api_key';
const BASE_URL = 'http://192.168.2.133:3000';

// 获取平台列表
const response = await fetch(`${BASE_URL}/api/platforms`, {
  headers: {
    'Authorization': `Bearer ${API_KEY}`
  }
});
const { data, total } = await response.json();
console.log(`共 ${total} 个平台`);

// 获取头条热点
const hotResponse = await fetch(
  `${BASE_URL}/api/platforms?platform=toutiao-hot&limit=10`,
  {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  }
);
const { platform, data: items } = await hotResponse.json();
console.log(`${platform.name} 热点：`, items.map(i => i.title));
```

### Python (requests)
```python
import requests

API_KEY = 'your_api_key'
BASE_URL = 'http://192.168.2.133:3000'

headers = {'Authorization': f'Bearer {API_KEY}'}

# 获取平台列表
resp = requests.get(f'{BASE_URL}/api/platforms', headers=headers)
result = resp.json()
print(f"共 {result['total']} 个平台")

# 获取头条热点
resp = requests.get(
    f'{BASE_URL}/api/platforms',
    params={'platform': 'toutiao-hot', 'limit': 10},
    headers=headers
)
result = resp.json()
print(f"{result['platform']['name']} 热点：")
for item in result['data'][:5]:
    print(f"  {item['rank']}. {item['title']}")
```

---

## 更新日志

### 2026-04-03
- 新增 `/api/platforms` 接口，支持获取平台列表和按平台查询热点
- 重构 `/api/nodes` 接口，改为按时间倒序返回新闻列表
- 新增 `/api/news` 内部接口（无需鉴权）
