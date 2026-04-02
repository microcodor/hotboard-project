# 🚀 快速方案：使用 Supabase 云服务

由于本地安装 Supabase 遇到权限问题，推荐使用 Supabase 云服务（免费）。

---

## 步骤 1：创建 Supabase 云账号

**访问**：https://supabase.com

1. 点击 **"Start your project"**
2. 使用 GitHub 账号登录（推荐）
3. 授权 Supabase 访问你的 GitHub

---

## 步骤 2：创建新项目

1. 创建新组织（如果还没有）
   - 组织名称：`My Organization`
   
2. 创建新项目
   - 项目名称：`hotboard`
   - 数据库密码：设置一个强密码（记住它！）
   - 区域：选择 **Singapore** (离中国最近)
   - 计划：**Free** (免费)

3. 等待项目创建（约 2-3 分钟）

---

## 步骤 3：获取配置信息

项目创建完成后：

1. 进入项目 **Dashboard**
2. 点击左侧菜单 **Settings** (齿轮图标)
3. 点击 **API**
4. 复制以下信息：

```
Project URL: https://xxx.supabase.co
anon public: eyJ...
service_role: eyJ...
```

---

## 步骤 4：更新环境变量

编辑 `C:\Users\Administrator\.qclaw\workspace\hotboard-project\.env.local`：

```env
# ============ Supabase ============
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ============ Tophub Data API ============
TOPHUB_API_KEY=placeholder

# ============ App Configuration ============
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=HotBoard
```

---

## 步骤 5：运行数据库迁移

在 Supabase Dashboard 中：

1. 点击左侧菜单 **SQL Editor**
2. 点击 **New query**
3. 复制粘贴 `supabase/migrations/` 中的 SQL 文件内容
4. 点击 **Run** 执行

或者使用 Supabase CLI（如果安装成功）：

```powershell
supabase db push
```

---

## 步骤 6：重启开发服务器

```powershell
# 在项目目录下
cd C:\Users\Administrator\.qclaw\workspace\hotboard-project
npm run dev
```

---

## 免费计划限制

Supabase 免费计划包括：
- ✅ 500 MB 数据库
- ✅ 1 GB 文件存储
- ✅ 50,000 月活用户
- ✅ 无限 API 请求
- ✅ 5 GB 带宽

对于开发和测试来说完全足够！

---

## 需要运行的 SQL（示例）

如果需要手动创建表，可以在 SQL Editor 中运行：

```sql
-- 用户资料表
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  favorites JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 收藏表
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  node_hashid TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, node_hashid)
);

-- 浏览历史表
CREATE TABLE browse_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  node_hashid TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE browse_history ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON favorites
  FOR DELETE USING (auth.uid() = user_id);
```

---

## 完成！

配置完成后，你的 HotBoard 项目就可以：
- ✅ 用户注册和登录
- ✅ 数据持久化
- ✅ 收藏功能
- ✅ 浏览历史

---

**推荐使用云服务，5 分钟即可完成配置！**
