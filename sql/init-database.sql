-- HotBoard 数据库初始化脚本
-- PostgreSQL 16+

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  favorites JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 榜单节点表
CREATE TABLE IF NOT EXISTS nodes (
  id SERIAL PRIMARY KEY,
  hashid VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  url TEXT,
  logo TEXT,
  category_id INTEGER,
  category_name VARCHAR(100),
  display_name VARCHAR(255),
  source_type VARCHAR(50) DEFAULT 'tophub',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 榜单项表（热点内容）
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  node_hashid VARCHAR(50) NOT NULL REFERENCES nodes(hashid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  hot_value BIGINT,
  rank INTEGER,
  thumbnail TEXT,
  description TEXT,
  extra JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 收藏表
CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_hashid VARCHAR(50) NOT NULL REFERENCES nodes(hashid) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, node_hashid)
);

-- 浏览历史表
CREATE TABLE IF NOT EXISTS browse_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_hashid VARCHAR(50) NOT NULL REFERENCES nodes(hashid) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 同步日志表
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  node_hashid VARCHAR(50) REFERENCES nodes(hashid) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL,
  items_count INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 缓存快照表
CREATE TABLE IF NOT EXISTS cache_snapshots (
  id SERIAL PRIMARY KEY,
  node_hashid VARCHAR(50) NOT NULL REFERENCES nodes(hashid) ON DELETE CASCADE,
  items JSONB NOT NULL,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(node_hashid, snapshot_date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_items_node ON items(node_hashid);
CREATE INDEX IF NOT EXISTS idx_items_created ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_hot ON items(node_hashid, hot_value DESC);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_node ON favorites(node_hashid);

CREATE INDEX IF NOT EXISTS idx_history_user ON browse_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_created ON browse_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_logs_node ON sync_logs(node_hashid);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON sync_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_snapshots_node ON cache_snapshots(node_hashid);
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON cache_snapshots(snapshot_date DESC);

-- 插入示例榜单节点
INSERT INTO nodes (hashid, name, category_name, display_name, url, logo) VALUES
('zhihu-hot', '知乎热榜', '综合', '知乎热榜', 'https://www.zhihu.com/hot', 'https://static.zhihu.com/heifetz/favicon.ico'),
('weibo-hot', '微博热搜', '综合', '微博热搜', 'https://s.weibo.com/top/summary', 'https://weibo.com/favicon.ico'),
('baidu-hot', '百度热搜', '综合', '百度热搜', 'https://top.baidu.com/board?tab=realtime', 'https://www.baidu.com/favicon.ico'),
('douyin-hot', '抖音热点', '视频', '抖音热点', 'https://www.douyin.com/hot', 'https://www.douyin.com/favicon.ico'),
('bilibili-hot', 'B站热门', '视频', 'B站热门', 'https://www.bilibili.com/v/popular/rank/all', 'https://www.bilibili.com/favicon.ico'),
('toutiao-hot', '今日头条', '综合', '今日头条', 'https://www.toutiao.com/c/user/token/', 'https://www.toutiao.com/favicon.ico'),
('thepaper-hot', '澎湃新闻', '新闻', '澎湃新闻', 'https://www.thepaper.cn/', 'https://www.thepaper.cn/favicon.ico'),
('sina-news', '新浪新闻', '新闻', '新浪新闻', 'https://news.sina.com.cn/', 'https://news.sina.com.cn/favicon.ico'),
('netease-news', '网易新闻', '新闻', '网易新闻', 'https://news.163.com/', 'https://news.163.com/favicon.ico'),
('36kr-hot', '36氪', '科技', '36氪', 'https://36kr.com/hot', 'https://36kr.com/favicon.ico'),
('juejin-hot', '掘金热榜', '科技', '掘金热榜', 'https://juejin.cn/', 'https://juejin.cn/favicon.ico'),
('v2ex-hot', 'V2EX', '科技', 'V2EX', 'https://www.v2ex.com/', 'https://www.v2ex.com/favicon.ico'),
('hn-hot', 'Hacker News', '科技', 'Hacker News', 'https://news.ycombinator.com/', 'https://news.ycombinator.com/favicon.ico')
ON CONFLICT (hashid) DO NOTHING;

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nodes_updated_at ON nodes;
CREATE TRIGGER update_nodes_updated_at BEFORE UPDATE ON nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建视图：热门榜单（根据同步次数和收藏数）
CREATE OR REPLACE VIEW popular_nodes AS
SELECT
  n.*,
  COUNT(DISTINCT f.user_id) as favorite_count,
  COUNT(DISTINCT s.id) as sync_count
FROM nodes n
LEFT JOIN favorites f ON n.hashid = f.node_hashid
LEFT JOIN sync_logs s ON n.hashid = s.node_hashid
GROUP BY n.id;

-- 创建视图：最新榜单项
CREATE OR REPLACE VIEW latest_items AS
SELECT DISTINCT ON (node_hashid)
  *
FROM items
ORDER BY node_hashid, created_at DESC;

-- 授权（如果使用独立用户）
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hotboard;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hotboard;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO hotboard;

-- 完成
SELECT 'HotBoard database initialized successfully!' as status;
