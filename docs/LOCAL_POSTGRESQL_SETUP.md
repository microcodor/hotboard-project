# 🗄️ HotBoard 本地 PostgreSQL 配置指南

---

## 方案一：使用 Docker（推荐）

### 前置条件
- Docker Desktop 已安装并运行

### 1. 配置 Docker 镜像加速（解决下载超时）

编辑 Docker Desktop 配置：
1. 打开 Docker Desktop
2. 点击 Settings (齿轮图标)
3. 选择 Docker Engine
4. 在 JSON 配置中添加：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerproxy.com",
    "https://docker.mirrors.ustc.edu.cn",
    "https://docker.nju.edu.cn"
  ]
}
```

5. 点击 "Apply & Restart"

### 2. 启动 PostgreSQL

```powershell
docker run --name hotboard-postgres `
  -e POSTGRES_PASSWORD=hotboard123 `
  -e POSTGRES_USER=hotboard `
  -e POSTGRES_DB=hotboard `
  -p 5432:5432 `
  -v hotboard-pgdata:/var/lib/postgresql/data `
  -d postgres:16-alpine
```

### 3. 验证运行状态

```powershell
docker ps | findstr hotboard-postgres
docker logs hotboard-postgres
```

---

## 方案二：Windows 原生安装

### 1. 下载 PostgreSQL

**官方下载**：https://www.postgresql.org/download/windows/

或使用 EnterpriseDB 安装包：
https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

选择 **PostgreSQL 16.x** Windows x86-64 版本

### 2. 安装步骤

1. 运行安装程序
2. Installation Directory: `C:\Program Files\PostgreSQL\16`
3. Select Components: 全选（默认）
4. Data Directory: `C:\Program Files\PostgreSQL\16\data`
5. **Password**: 设置超级用户密码（例如：`hotboard123`）
6. Port: `5432`（默认）
7. Locale: `Chinese, China` 或 `C`

### 3. 添加到 PATH

```powershell
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"
```

或永久添加：
```powershell
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\PostgreSQL\16\bin", "User")
```

### 4. 启动服务

```powershell
# 检查服务状态
Get-Service postgresql*

# 启动服务
Start-Service postgresql-x64-16

# 设置开机自启
Set-Service postgresql-x64-16 -StartupType Automatic
```

---

## 方案三：使用 Scoop 安装

### 1. 安装 Scoop（如果没有）

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
```

### 2. 安装 PostgreSQL

```powershell
scoop bucket add extras
scoop install postgresql
```

### 3. 初始化数据库

```powershell
# 初始化数据目录
initdb -D "C:\Users\Administrator\scoop\apps\postgresql\current\data" -U postgres -E UTF8

# 启动服务
pg_ctl -D "C:\Users\Administrator\scoop\apps\postgresql\current\data" -l logfile start

# 创建数据库和用户
psql -U postgres -c "CREATE USER hotboard WITH PASSWORD 'hotboard123';"
psql -U postgres -c "CREATE DATABASE hotboard OWNER hotboard;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE hotboard TO hotboard;"
```

---

## 配置 HotBoard 项目

### 1. 安装 PostgreSQL 客户端库

```powershell
cd C:\Users\Administrator\.qclaw\workspace\hotboard-project
npm install pg
npm install @types/pg -D
```

### 2. 创建数据库配置文件

创建 `lib/db-pg.ts`：

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'hotboard',
  user: process.env.PG_USER || 'hotboard',
  password: process.env.PG_PASSWORD || 'hotboard123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;
```

### 3. 更新 `.env.local`

```env
# ============ PostgreSQL (本地) ============
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=hotboard
PG_USER=hotboard
PG_PASSWORD=hotboard123

# 数据库连接字符串（用于其他工具）
DATABASE_URL=postgresql://hotboard:hotboard123@localhost:5432/hotboard

# ============ App Configuration ============
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=HotBoard
```

### 4. 创建数据库表

运行 SQL 脚本：

```powershell
# 连接数据库
psql -h localhost -U hotboard -d hotboard

# 或使用连接字符串
psql postgresql://hotboard:hotboard123@localhost:5432/hotboard
```

执行以下 SQL：

```sql
-- 用户表
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 榜单节点表
CREATE TABLE nodes (
  id SERIAL PRIMARY KEY,
  hashid VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  url TEXT,
  logo TEXT,
  category_id INTEGER,
  category_name VARCHAR(100),
  display_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 榜单项表
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  node_hashid VARCHAR(50) REFERENCES nodes(hashid),
  title TEXT NOT NULL,
  url TEXT,
  hot_value BIGINT,
  rank INTEGER,
  thumbnail TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 收藏表
CREATE TABLE favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  node_hashid VARCHAR(50) REFERENCES nodes(hashid),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, node_hashid)
);

-- 浏览历史表
CREATE TABLE browse_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  node_hashid VARCHAR(50) REFERENCES nodes(hashid),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_items_node ON items(node_hashid);
CREATE INDEX idx_items_created ON items(created_at DESC);
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_history_user ON browse_history(user_id);
CREATE INDEX idx_history_created ON browse_history(created_at DESC);

-- 插入示例数据
INSERT INTO nodes (hashid, name, category_name, display_name) VALUES
('zhihu-hot', '知乎热榜', '综合', '知乎热榜'),
('weibo-hot', '微博热搜', '综合', '微博热搜'),
('baidu-hot', '百度热搜', '综合', '百度热搜'),
('douyin-hot', '抖音热点', '视频', '抖音热点'),
('bilibili-hot', 'B站热门', '视频', 'B站热门');
```

### 5. 测试连接

创建测试脚本 `scripts/test-db.ts`：

```typescript
import pool from '../lib/db-pg';

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0]);
    
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📊 Tables:', tables.rows.map(r => r.table_name).join(', '));
    
    await pool.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();
```

运行测试：
```powershell
npx tsx scripts/test-db.ts
```

---

## 常用命令

### Docker 方式

```powershell
# 查看容器状态
docker ps -a | findstr hotboard

# 查看日志
docker logs hotboard-postgres

# 进入容器
docker exec -it hotboard-postgres psql -U hotboard -d hotboard

# 停止容器
docker stop hotboard-postgres

# 启动容器
docker start hotboard-postgres

# 删除容器
docker rm -f hotboard-postgres

# 备份数据
docker exec hotboard-postgres pg_dump -U hotboard hotboard > backup.sql

# 恢复数据
docker exec -i hotboard-postgres psql -U hotboard hotboard < backup.sql
```

### 原生安装方式

```powershell
# 连接数据库
psql -U hotboard -d hotboard

# 列出数据库
psql -U postgres -l

# 列出表
psql -U hotboard -d hotboard -c "\dt"

# 备份
pg_dump -U hotboard hotboard > backup.sql

# 恢复
psql -U hotboard hotboard < backup.sql
```

---

## 管理工具推荐

### GUI 工具

1. **pgAdmin 4**（官方，功能完整）
   - 下载：https://www.pgadmin.org/download/
   - 通常随 PostgreSQL 安装

2. **DBeaver**（免费开源）
   - 下载：https://dbeaver.io/download/
   - 支持多种数据库

3. **HeidiSQL**（Windows 专用，轻量）
   - 下载：https://www.heidisql.com/download.php

4. **TablePlus**（现代化界面）
   - 下载：https://tableplus.com/

### 命令行工具

```powershell
# 安装
npm install -g node-pg-migrate

# 创建迁移
node-pg-migrate create my-migration
```

---

## 性能优化

### 连接池配置

```typescript
const pool = new Pool({
  max: 20,                    // 最大连接数
  idleTimeoutMillis: 30000,   // 空闲连接超时
  connectionTimeoutMillis: 2000,
  statement_timeout: 10000,   // 查询超时
});
```

### 索引优化

```sql
-- 分析查询性能
EXPLAIN ANALYZE SELECT * FROM items WHERE node_hashid = 'zhihu-hot';

-- 创建部分索引
CREATE INDEX idx_items_hot ON items(node_hashid, hot_value DESC)
WHERE hot_value > 1000;

-- 定期清理
VACUUM ANALYZE items;
```

---

## 推荐方案总结

| 方案 | 优点 | 缺点 | 推荐场景 |
|-----|------|------|---------|
| **Docker** | 隔离性好，易于管理 | 需要下载镜像，占用资源 | 开发环境 |
| **原生安装** | 性能最好，无依赖 | 安装复杂，难以卸载 | 生产环境 |
| **Scoop** | 安装简单，易于更新 | 功能可能不完整 | 开发环境 |

**个人推荐**：开发环境用 **Docker**，生产环境用云数据库或原生安装。

---

## 下一步

1. 选择一种方式安装 PostgreSQL
2. 运行 SQL 创建表结构
3. 更新 `.env.local` 配置
4. 重启开发服务器测试

---

**配置完成后，HotBoard 就可以完全本地运行了！** 🚀
