# HotBoard 部署指南

> 适用版本：v1.0.0+  
> 更新日期：2026-03-28  
> 部署平台：Vercel + Supabase

---

## 目录

- [快速部署](#快速部署)
- [手动部署](#手动部署)
- [环境变量配置](#环境变量配置)
- [域名配置](#域名配置)
- [监控与告警](#监控与告警)
- [回滚操作](#回滚操作)
- [常见问题](#常见问题)

---

## 快速部署

### 方式一：Vercel CLI 部署（推荐）

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 进入项目目录
cd hotboard-project

# 4. 链接已有项目（或创建新项目）
vercel link

# 5. 部署预览环境
vercel

# 6. 部署生产环境
vercel --prod
```

### 方式二：GitHub 一键部署

1. 推送代码到 GitHub 仓库
2. 访问 [vercel.com](https://vercel.com)
3. 点击 "Import Project"
4. 选择仓库 `hotboard-project`
5. 配置环境变量（见下方）
6. 点击 "Deploy"

---

## 手动部署

### 前置条件

- Node.js >= 20.0.0
- npm >= 9.0.0 或 pnpm >= 8.0.0
- Vercel 账号
- Supabase 项目

### 部署步骤

```bash
# 克隆项目
git clone https://github.com/your-org/hotboard.git
cd hotboard

# 安装依赖
npm install

# 本地构建测试
npm run build

# 启动生产服务器
npm run start
```

---

## 环境变量配置

### 必需变量

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名 Key | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务端 Key | Supabase Dashboard > Settings > API |

### 可选变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NEXT_PUBLIC_APP_NAME` | 应用名称 | HotBoard |
| `NEXT_PUBLIC_APP_URL` | 应用地址 | - |
| `NEXT_PUBLIC_APP_DESCRIPTION` | 应用描述 | 全网热榜聚合平台 |
| `NEXT_TELEMETRY_DISABLED` | 禁用遥测 | 1 |
| `VERCEL_GIT_COMMIT_SHA` | Git 提交 SHA | 自动注入 |

### 配置方式

**Vercel Dashboard：**
1. 进入项目 > Settings > Environment Variables
2. 添加所有必需变量
3. 选择应用范围：Production / Preview / Development
4. 保存后自动重新部署

**本地开发：**
```bash
# 复制示例配置
cp .env.local.example .env.local

# 编辑配置
# 填入 Supabase URL 和 ANON KEY
```

---

## 域名配置

### 添加自定义域名

1. Vercel Dashboard > 项目 > Settings > Domains
2. 输入域名：`hotboard.example.com`
3. 点击 "Add"
4. 在域名 DNS 服务商添加记录：
   ```
   # A 记录（推荐）
   Type: A
   Name: hotboard
   Value: 76.76.21.21
   
   # 或 CNAME 记录
   Type: CNAME
   Name: hotboard
   Value: cname.vercel-dns.com
   ```
5. 等待 DNS 生效（约 2-5 分钟）

### 配置 HTTPS

Vercel 自动提供免费 SSL 证书，自动续期，无需手动配置。

---

## 监控与告警

### Vercel 内置监控

- **Analytics**：访问量、带宽、性能指标
- **Speed Insights**：核心 Web 指标（LCP、FID、CLS）
- **Function Logs**：Serverless 函数日志

访问：`https://vercel.com/dashboard` > 项目 > Analytics / Logs

### 部署状态检查

```bash
# 查看最近部署状态
vercel ls

# 查看特定部署详情
vercel inspect <deployment-url>
```

### 健康检查

```bash
# 本地测试
curl http://localhost:3000/api/monitoring

# 生产环境测试（替换为你的域名）
curl https://hotboard.example.com/api/monitoring
```

预期响应：
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-03-28T14:00:00.000Z",
  "uptime": 86400
}
```

---

## 回滚操作

### 通过 Vercel Dashboard 回滚

1. 进入项目 > Deployments
2. 找到目标版本
3. 点击 "..." > "Promote to Production"

### 通过 CLI 回滚

```bash
# 列出最近部署
vercel ls

# 回滚到指定部署
vercel rollback <deployment-url>

# 或使用 Git 回滚
git revert <commit-sha>
git push origin main
# 自动触发新部署
```

### 回滚到特定提交

```bash
# 查看提交历史
git log --oneline

# 切换到目标提交
git checkout <commit-sha>

# 部署该版本
vercel --prod
```

---

## 常见问题

### Q1: 部署失败，显示 "Build Failed"

**可能原因：**
- 环境变量未配置
- Supabase 连接失败
- 构建超时

**解决方法：**
1. 检查 Vercel Build Logs
2. 确认所有必需环境变量已配置
3. 检查 Supabase 项目状态
4. 重新触发部署

### Q2: 部署成功但页面空白

**可能原因：**
- `NEXT_PUBLIC` 变量未正确注入
- 重定向配置错误

**解决方法：**
1. 检查浏览器控制台错误
2. 确认 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已配置
3. 检查 `next.config.js` 重定向配置

### Q3: API 请求返回 500 错误

**可能原因：**
- Supabase 连接字符串错误
- RLS 策略阻止访问

**解决方法：**
1. 检查 Supabase Dashboard > SQL Editor
2. 运行迁移脚本
3. 确认 RLS 策略配置正确
4. 检查 Supabase 服务状态

### Q4: 定时任务不执行

**可能原因：**
- Cron 配置错误
- Vercel Hobby 计划限制

**解决方法：**
1. 确认 `vercel.json` 中 crons 配置正确
2. 检查 Vercel 计划（Hobby 计划最多 3 个 cron jobs）
3. 升级到 Pro 计划以获得更多 cron jobs

### Q5: 图片加载失败

**可能原因：**
- 图片域名未在 `next.config.js` 中配置
- 图片 CDN 不可用

**解决方法：**
检查 `next.config.js` 中 `images.remotePatterns` 是否包含所需域名：

```javascript
images: {
  remotePatterns: [
    { hostname: 'pica.zhimg.com' },
    { hostname: '*.hdslb.com' },
    // 添加其他需要的域名
  ]
}
```

---

## 附录：部署检查清单

部署前请确认以下项目已完成：

### 代码层面
- [ ] 所有测试通过：`npm run test`
- [ ] 类型检查通过：`npm run type-check`
- [ ] ESLint 检查通过：`npm run lint`
- [ ] 构建成功：`npm run build`

### 环境配置
- [ ] Supabase 项目已创建
- [ ] 数据库迁移已完成
- [ ] RLS 策略已配置
- [ ] 所有环境变量已设置

### Vercel 配置
- [ ] 项目已导入 Vercel
- [ ] 环境变量已配置
- [ ] 自定义域名已配置（如需要）
- [ ] GitHub 集成已配置（自动部署）

### 监控配置
- [ ] 部署通知已配置
- [ ] 错误告警已配置
- [ ] 定期健康检查已确认

---

**文档版本：** v1.0.0  
**维护者：** HotBoard Team  
**反馈：** 如有问题，请提交 Issue 到 GitHub 仓库
