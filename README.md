# HotBoard 热榜聚合平台

全网热榜聚合平台，支持 **19 个平台**，**实时更新**，覆盖综合、视频、新闻、科技等分类。

---

## 🚀 快速开始

### 1. 安装 PostgreSQL 并创建数据库

```bash
# 创建数据库和用户（替换为你自己的密码）
psql -U postgres -c "CREATE USER hotboard WITH PASSWORD 'your_password';"
psql -U postgres -c "CREATE DATABASE hotboard OWNER hotboard;"
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 并填写配置：

```bash
cp .env.example .env.local
```

### 4. 初始化数据库

```bash
psql -U hotboard -d hotboard < sql/init-database.sql
```

### 5. 启动应用

```bash
npm run dev
```

访问 http://localhost:3000

---

## 🐳 Docker 一键部署

```bash
docker compose up -d
```

这将启动：
- `postgres` - PostgreSQL 数据库
- `app` - Next.js 应用
- `worker` - 定时抓取调度器

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f app

# 停止服务
docker compose down
```

---

## ⚙️ PM2 部署（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 使用 ecosystem 配置启动
pm2 start ecosystem.config.js

# 开机自启
pm2 startup
pm2 save
```

---

## 📡 支持的平台（19 个）

| 分类 | 平台 |
|-----|------|
| 国内综合 | 微博热搜、知乎热榜、头条热榜、百度热搜 |
| 国内视频 | B站热门、抖音热点 |
| 国内新闻 | 腾讯新闻、人民日报、新华社、澎湃新闻 |
| 国内科技 | 掘金热榜、36氪、少数派 |
| 国际社区 | GitHub Trending、Hacker News、Dev.to、Lobsters |
| 其他 | HN Best、豆瓣电影 |

---

## 📡 API 接口

所有接口文档详见 `/docs` 页面。

### 鉴权方式

```bash
# Header 方式（推荐）
Authorization: Bearer hb_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 主要接口

| 接口 | 鉴权 | 说明 |
|------|------|------|
| `GET /api/platforms` | 无需 | 获取所有平台列表 |
| `GET /api/feeds?platform=xxx` | 需要 | 根据平台获取热点 |
| `GET /api/nodes` | 需要 | 按时间倒序返回最新热点 |

---

## 🔐 认证系统

### 注册

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password",
  "displayName": "用户名"
}
```

### 登录

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

---

## 🛠️ 管理后台

访问 `/admin` 登录后使用：

| 功能 | 说明 |
|-----|------|
| 仪表盘 | 数据统计概览 |
| 用户管理 | 查看和管理用户 |
| 平台管理 | 平台配置 |
| 内容管理 | 热点内容管理 |
| 卡密管理 | 生成和管理卡密 |
| 抓取任务 | 查看抓取历史、手动/定时抓取 |

---

## 📁 项目结构

```
hotboard-project/
├── app/
│   ├── api/                    # API 路由
│   │   ├── admin/              # 管理后台 API
│   │   ├── auth/               # 认证 API
│   │   ├── feeds/              # 平台热点 API
│   │   ├── nodes/              # 最新热点 API
│   │   ├── platforms/          # 平台列表 API
│   │   └── internal/           # 内部接口（首页用）
│   ├── admin/                  # 管理后台页面
│   ├── docs/                   # API 文档页面
│   ├── user/                   # 用户后台页面
│   └── ...
├── components/                 # React 组件
├── lib/                        # 工具库
├── scripts/                    # 脚本
├── sql/                        # 数据库脚本
├── docs/                       # 文档
├── ecosystem.config.js         # PM2 配置
└── package.json
```

---

## 🔧 环境变量

```env
# 数据库连接
DATABASE_URL=postgresql://user:password@localhost:5432/hotboard

# JWT 密钥（请使用随机字符串）
JWT_SECRET=your-secret-key-here

# 内部接口 Token（首页调用内部 API 用）
INTERNAL_TOKEN=your-internal-token
NEXT_PUBLIC_INTERNAL_TOKEN=your-internal-token
```

---

## 📊 性能指标

- 首页加载: ~500ms
- 数据库查询: <100ms
- API 响应: <200ms
- 抓取耗时: 约 60 秒（19 个平台）

---

## 📝 更新日志

### v2.1 (2026-04-03)
- 新增 `/api/platforms` 公开接口（无需鉴权）
- 新增 `/api/feeds` 接口（按平台获取热点）
- 重构 `/api/nodes` 接口（按时间倒序返回混合热点）
- 更新 `/docs` API 文档页面

### v2.0 (2026-04-02)
- 支持 PM2 部署
- API 内外分离（内部接口 / 外部鉴权接口）
- 19 个平台完整支持
- 用户余额与 API Key 管理

### v1.0 (2026-03-31)
- 基础功能上线
- 用户注册/登录
- 热点聚合展示
