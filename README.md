# HotBoard 热榜聚合平台

全网热榜聚合平台，支持 **19 个平台**，**实时更新**，覆盖综合、视频、新闻、科技、影视、国际等分类。

---

## 🚀 快速开始

### 1. 启动 PostgreSQL
```bash
docker run -d --name hotboard-postgres \
  -e POSTGRES_USER=hotboard \
  -e POSTGRES_PASSWORD=hotboard123 \
  -e POSTGRES_DB=hotboard \
  -p 5432:5432 \
  postgres:15-alpine
```

### 2. 安装依赖
```bash
npm install
```

### 3. 初始化数据库
```bash
docker exec -i hotboard-postgres psql -U hotboard -d hotboard < sql/init-database.sql
```

### 4. 启动应用
```bash
npm run dev
```

访问 http://localhost:3000

---

## 🐳 Docker 一键部署

### 启动所有服务
```bash
docker compose up -d
```

这将启动：
- `postgres` - PostgreSQL 数据库
- `app` - Next.js 应用
- `worker` - 定时抓取调度器

### 查看服务状态
```bash
docker compose ps
```

### 查看日志
```bash
# 应用日志
docker compose logs -f app

# Worker 日志
docker compose logs -f worker

# 数据库日志
docker compose logs -f postgres
```

### 停止服务
```bash
docker compose down
```

---

## ⚙️ Worker 定时抓取

### 工作原理

Worker 是独立的定时调度器，不依赖 QClaw 或其他外部服务。

```
Worker (每小时整点)
    ↓
抓取 19 个平台
    ↓
同步到数据库
```

### 启动方式

#### 方式一：Docker 部署（推荐）

```bash
# 启动 Worker
docker compose up -d worker

# 查看状态
curl http://localhost:3001/status

# 查看日志
docker compose logs -f worker
```

#### 方式二：Node.js 直接运行

```bash
cd C:\Users\Administrator\.qclaw\workspace\hotboard-project
node scripts/worker.js
```

#### 方式三：Windows 服务（可选）

使用 NSSM 将 Worker 注册为 Windows 服务：

```bash
# 安装 NSSM
choco install nssm

# 创建服务
nssm install HotBoardWorker "node" "C:\path\to\hotboard\scripts\worker.js"
nssm set HotBoardWorker AppDirectory "C:\path\to\hotboard"
nssm set HotBoardWorker Start SERVICE_AUTO_START

# 启动服务
nssm start HotBoardWorker
```

### Worker API

Worker 提供 HTTP API 用于管理：

| 端点 | 方法 | 说明 |
|-----|------|------|
| `/status` | GET | 获取状态 |
| `/trigger` | POST | 手动触发抓取 |
| `/reload` | POST | 重新加载定时配置 |
| `/logs` | GET | 获取最近日志 |

```bash
# 查看状态
curl http://localhost:3001/status

# 手动触发抓取
curl -X POST http://localhost:3001/trigger

# 重新加载定时配置
curl -X POST http://localhost:3001/reload
```

### 定时配置

在管理后台配置定时任务：访问 `/admin/crawl` → "定时配置"

支持的 Cron 表达式：
- `0 * * * *` - 每小时整点
- `0 */2 * * *` - 每 2 小时
- `0 8,12,18 * * *` - 每天 8/12/18 点
- `0 9-22/3 * * *` - 每天 9-22 点每 3 小时

---

## 📡 支持的平台（19 个）

| 分类 | 平台 | 数据量 |
|-----|------|-------|
| 国内综合 | 微博热搜、知乎热榜、头条热榜、百度热搜 | 各 48-50 条 |
| 国内视频 | B站热门、抖音热点 | 各 48-50 条 |
| 国内新闻 | 腾讯新闻、人民日报、新华社、澎湃新闻 | 各 20-30 条 |
| 国内科技 | 掘金热榜、36氪、少数派 | 各 10-20 条 |
| 国际社区 | GitHub Trending、Dev.to、Lobsters、HN Best | 各 24-25 条 |
| 其他 | Hacker News、豆瓣电影 | 各 20-30 条 |

---

## 🔐 认证系统

### 注册
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "用户名"
}
```

### 登录
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### API Key 认证
```bash
# Header 方式（推荐）
curl -H "Authorization: Bearer hb_xxxxxxxx" https://api.example.com/api/nodes

# Query 参数方式
curl https://api.example.com/api/nodes?api_key=hb_xxxxxxxx
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
| API 文档 | 管理 API 文档内容 |
| 知识库 | 平台抓取方式说明 |

---

## 📁 项目结构

```
hotboard-project/
├── app/
│   ├── api/                    # API 路由
│   │   ├── admin/              # 管理后台 API
│   │   ├── auth/              # 认证 API
│   │   ├── crawl/             # 抓取相关 API
│   │   └── ...
│   ├── admin/                 # 管理后台页面
│   ├── user/                  # 用户后台页面
│   └── ...
├── components/                # React 组件
├── lib/                       # 工具库
├── scripts/
│   ├── worker.js              # Worker 主程序
│   ├── crawl-builtin.js       # 内置抓取模块
│   └── ...
├── sql/                       # 数据库脚本
├── docs/                      # 文档
├── docker-compose.yml         # Docker 编排
├── Dockerfile                  # 应用镜像
├── Dockerfile.worker          # Worker 镜像
└── package.json
```

---

## 🔧 环境变量

```env
# 数据库
DATABASE_URL=postgresql://hotboard:hotboard123@localhost:5432/hotboard

# JWT 密钥
JWT_SECRET=your-secret-key-here

# Worker API 端口
WORKER_PORT=3001

# HotBoard API 地址（Worker 用）
HOTBOARD_URL=http://localhost:3000
```

---

## 📊 性能指标

- 首页加载: ~500ms
- 数据库查询: <100ms
- API 响应: <200ms
- 抓取耗时: 约 60 秒（19 个平台）

---

## 🐛 常见问题

### Q: Worker 没有执行定时任务？
A: 检查 Worker 进程是否运行：
```bash
curl http://localhost:3001/status
```

### Q: 手动触发抓取无效？
A: 确保 Worker 正在运行，然后调用：
```bash
curl -X POST http://localhost:3001/trigger
```

### Q: 时间显示差 8 小时？
A: 这是因为浏览器时区设置。请确保系统时区为北京时间。

### Q: Docker 部署后 Worker 连接不上？
A: 检查网络和端口映射：
```bash
docker compose ps
curl http://localhost:3001/status
```

---

## 📝 更新日志

### v2.0 (2026-04-02)
- Worker 独立调度器，完全脱离 QClaw
- 支持多个定时配置
- 管理后台集成抓取管理
- 19 个平台完整支持

### v1.0 (2026-03-31)
- 基础功能上线
- 用户注册/登录
- 热点聚合展示

---

## 📞 信息

- **项目路径**: `C:\Users\Administrator\.qclaw\workspace\hotboard-project\`
- **数据库**: Docker 容器 `hotboard-postgres`
- **开发服务器**: http://localhost:3000
- **Worker API**: http://localhost:3001
- **管理员账号**: `admin@hotboard.com` / `admin123456`

---

**最后更新**: 2026-04-02 09:22 GMT+8
