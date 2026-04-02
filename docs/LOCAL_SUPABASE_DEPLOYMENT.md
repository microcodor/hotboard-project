# 🚀 本地 Supabase 部署指南

**部署方式**：使用 Supabase CLI（推荐）或 Docker Compose

---

## 方式一：使用 Supabase CLI（推荐）

### 1. 安装 Supabase CLI

**Windows (使用 Scoop)**:
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Windows (使用 Chocolatey)**:
```powershell
choco install supabase
```

**Windows (使用 npm)**:
```powershell
npm install -g supabase
```

### 2. 初始化本地 Supabase

```powershell
# 进入项目目录
cd C:\Users\Administrator\.qclaw\workspace\hotboard-project

# 初始化 Supabase
supabase init

# 启动本地 Supabase（首次启动会下载 Docker 镜像，需要几分钟）
supabase start
```

### 3. 获取本地配置信息

启动成功后，会显示本地配置信息：

```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
anon key: eyJ...
service_role key: eyJ...
```

### 4. 更新环境变量

编辑 `.env.local` 文件：

```env
# ============ Supabase (本地) ============
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...（从上面的输出复制）
SUPABASE_SERVICE_ROLE_KEY=eyJ...（从上面的输出复制）

# ============ Tophub Data API ============
TOPHUB_API_KEY=placeholder-tophub-api-key

# ============ App Configuration ============
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=HotBoard
NEXT_PUBLIC_APP_DESCRIPTION=Hot Trends Aggregator
```

### 5. 运行数据库迁移

```powershell
# 推送数据库结构到本地 Supabase
supabase db push
```

### 6. 重启开发服务器

```powershell
# 停止当前服务器（Ctrl+C）
# 重新启动
npm run dev
```

---

## 方式二：使用 Docker Compose（手动部署）

### 1. 安装 Docker Desktop

下载地址：https://www.docker.com/products/docker-desktop

### 2. 克隆 Supabase 仓库

```powershell
cd C:\Users\Administrator
git clone --depth 1 https://github.com/supabase/supabase
cd supabase
```

### 3. 配置环境变量

```powershell
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，设置必要的配置
```

### 4. 启动服务

```powershell
# 使用 Docker Compose 启动
docker-compose up -d
```

### 5. 访问服务

- API: http://localhost:8000
- Studio: http://localhost:3000
- PostgreSQL: localhost:5432

---

## 方式三：使用 Supabase 云服务（最快）

如果本地部署遇到问题，可以使用 Supabase 云服务：

### 1. 创建 Supabase 项目

访问：https://supabase.com

1. 点击 "Start your project"
2. 使用 GitHub 账号登录
3. 创建新组织（如果还没有）
4. 创建新项目
   - 名称：hotboard
   - 数据库密码：（设置一个强密码）
   - 区域：选择最近的区域（如 Singapore）

### 2. 获取配置信息

项目创建后：

1. 进入项目设置 > API
2. 复制以下信息：
   - Project URL
   - anon public key
   - service_role key

### 3. 更新环境变量

编辑 `.env.local` 文件，填入真实的配置：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 推荐：使用 Supabase CLI

**最简单的方式**：使用 Supabase CLI

```powershell
# 1. 安装
npm install -g supabase

# 2. 初始化
cd C:\Users\Administrator\.qclaw\workspace\hotboard-project
supabase init

# 3. 启动
supabase start

# 4. 获取配置信息
supabase status
```

---

## 常用命令

```powershell
# 启动本地 Supabase
supabase start

# 停止本地 Supabase
supabase stop

# 查看状态
supabase status

# 重置数据库
supabase db reset

# 查看日志
supabase logs

# 推送迁移
supabase db push
```

---

## 故障排查

### Docker 未启动

错误：`Cannot connect to the Docker daemon`

解决：
1. 启动 Docker Desktop
2. 等待 Docker 完全启动（托盘图标稳定）
3. 重新运行 `supabase start`

### 端口被占用

错误：`Port 54321 is already in use`

解决：
```powershell
# 查看端口占用
netstat -ano | findstr :54321

# 结束占用进程
taskkill /PID <pid> /F

# 或修改 Supabase 端口
supabase start --api-port 54322
```

### 迁移失败

错误：`Migration failed`

解决：
```powershell
# 重置数据库
supabase db reset

# 重新推送迁移
supabase db push
```

---

## 下一步

部署完成后：

1. 访问 Supabase Studio：http://localhost:54323
2. 创建必要的表结构
3. 重启 HotBoard 开发服务器
4. 测试完整功能

---

**推荐使用 Supabase CLI 方式，最简单快捷！**
