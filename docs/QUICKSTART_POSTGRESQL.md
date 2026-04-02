# 🚀 HotBoard 本地 PostgreSQL 快速启动

**预计完成时间**：10 分钟

---

## 📋 前置条件

- ✅ Docker Desktop 已安装并运行
- ✅ Node.js 18+ 已安装

---

## 步骤 1：配置 Docker 镜像加速（解决下载超时）

### 1.1 打开 Docker Desktop

### 1.2 配置镜像加速

1. 点击右上角 **Settings** (齿轮图标)
2. 选择左侧 **Docker Engine**
3. 在 JSON 配置中添加镜像加速：

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

4. 点击 **Apply & Restart**
5. 等待 Docker 重启完成（约 10-30 秒）

---

## 步骤 2：启动 PostgreSQL 容器

```powershell
# 进入项目目录
cd C:\Users\Administrator\.qclaw\workspace\hotboard-project

# 启动 PostgreSQL
docker run --name hotboard-postgres `
  -e POSTGRES_PASSWORD=hotboard123 `
  -e POSTGRES_USER=hotboard `
  -e POSTGRES_DB=hotboard `
  -p 5432:5432 `
  -v hotboard-pgdata:/var/lib/postgresql/data `
  -d postgres:16-alpine
```

等待镜像下载和容器启动（约 2-5 分钟，取决于网络速度）

---

## 步骤 3：验证 PostgreSQL 运行状态

```powershell
# 检查容器状态
docker ps | findstr hotboard-postgres

# 查看日志
docker logs hotboard-postgres

# 应该看到类似输出：
# PostgreSQL init process complete; ready for start up.
# PostgreSQL stand-alone mode
# database system is ready to accept connections
```

---

## 步骤 4：初始化数据库

```powershell
# 进入容器执行 SQL
docker exec -i hotboard-postgres psql -U hotboard -d hotboard < sql\init-database.sql

# 验证表创建成功
docker exec -it hotboard-postgres psql -U hotboard -d hotboard -c "\dt"
```

应该看到：
```
              List of relations
 Schema |      Name       | Type  |  Owner
--------+-----------------+-------+----------
 public | browse_history  | table | hotboard
 public | cache_snapshots | table | hotboard
 public | favorites       | table | hotboard
 public | items           | table | hotboard
 public | nodes           | table | hotboard
 public | sync_logs       | table | hotboard
 public | users           | table | hotboard
```

---

## 步骤 5：安装 PostgreSQL 客户端库

```powershell
cd C:\Users\Administrator\.qclaw\workspace\hotboard-project

npm install pg
npm install @types/pg --save-dev
```

---

## 步骤 6：配置环境变量

```powershell
# 复制配置文件
Copy-Item .env.postgresql .env.local

# 验证配置
Get-Content .env.local | Select-String "PG_"
```

应该看到：
```
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=hotboard
PG_USER=hotboard
PG_PASSWORD=hotboard123
```

---

## 步骤 7：测试数据库连接

```powershell
# 创建测试脚本
npx tsx -e "import { testConnection } from './lib/db-pg'; testConnection().then(() => process.exit(0));"
```

应该看到：
```
✅ Database connected: 2026-03-30 08:30:00.123+08
```

---

## 步骤 8：启动开发服务器

```powershell
npm run dev
```

访问：http://localhost:3000

---

## 🎉 完成！

现在你的 HotBoard 项目已经完全本地运行，包括：
- ✅ PostgreSQL 数据库
- ✅ 数据库连接池
- ✅ 所有数据表
- ✅ 示例数据

---

## 📊 常用操作

### 查看数据

```powershell
# 进入 PostgreSQL 命令行
docker exec -it hotboard-postgres psql -U hotboard -d hotboard

# 查看所有榜单
SELECT * FROM nodes;

# 查看某个榜单的热点
SELECT * FROM items WHERE node_hashid = 'zhihu-hot' ORDER BY rank LIMIT 10;

# 退出
\q
```

### 停止/启动数据库

```powershell
# 停止
docker stop hotboard-postgres

# 启动
docker start hotboard-postgres

# 重启
docker restart hotboard-postgres
```

### 备份数据

```powershell
# 备份
docker exec hotboard-postgres pg_dump -U hotboard hotboard > backup.sql

# 恢复
docker exec -i hotboard-postgres psql -U hotboard hotboard < backup.sql
```

### 查看日志

```powershell
# 查看容器日志
docker logs hotboard-postgres

# 实时查看
docker logs -f hotboard-postgres
```

---

## 🔧 故障排查

### 问题：容器启动失败

```powershell
# 检查端口占用
netstat -ano | findstr :5432

# 删除旧容器
docker rm -f hotboard-postgres

# 重新启动
docker run --name hotboard-postgres ...（步骤2的命令）
```

### 问题：无法连接数据库

```powershell
# 检查容器状态
docker ps -a | findstr hotboard

# 检查日志
docker logs hotboard-postgres

# 重启容器
docker restart hotboard-postgres
```

### 问题：镜像下载超时

1. 确认 Docker 镜像加速已配置（步骤1）
2. 尝试使用其他镜像源
3. 或使用代理

---

## 📚 相关文档

- `docs/LOCAL_POSTGRESQL_SETUP.md` - 详细配置指南
- `sql/init-database.sql` - 数据库初始化脚本
- `lib/db-pg.ts` - PostgreSQL 客户端

---

## 💡 提示

**Docker 镜像加速配置是最关键的一步！**

如果镜像下载失败，请确保：
1. Docker Desktop 正在运行
2. 镜像加速配置正确
3. 网络连接正常

---

**祝你使用愉快！** 🚀
