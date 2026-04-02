-- 创建 API 文档表
CREATE TABLE IF NOT EXISTS api_docs (
  id SERIAL PRIMARY KEY,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  params TEXT[] DEFAULT '{}',
  auth VARCHAR(100) DEFAULT '',
  response TEXT DEFAULT '',
  group_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(method, path)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_api_docs_group ON api_docs(group_name);
CREATE INDEX IF NOT EXISTS idx_api_docs_method ON api_docs(method);

-- 插入初始数据（仅内容相关接口）
INSERT INTO api_docs (method, path, description, params, auth, response, group_name) VALUES
('GET', '/api/nodes', '获取所有榜单节点及其热点数据', ARRAY['cid=分类名', 'limit=数量(默认12)', 'offset=偏移'], '可选', '{ success: true, data: [...nodes], total, rateLimit: { plan, limit, used, remaining } }', '公开接口'),
('GET', '/api/nodes/[hashid]', '获取单个榜单详情', ARRAY['hashid=节点ID'], '可选', '{ success: true, data: { node, items: [...] } }', '公开接口'),
('GET', '/api/search', '跨平台搜索热点', ARRAY['q=关键词', 'platform=平台hashid', 'page', 'limit'], '可选', '{ success: true, data: [...results], total }', '公开接口'),
('GET', '/api/categories', '获取所有分类', ARRAY[]::TEXT[], '无需', '{ success: true, data: [{ id, name }] }', '公开接口'),
('GET', '/api/hot', '获取跨平台热点聚合', ARRAY['range=day/week/month', 'limit=数量'], '可选', '{ success: true, data: [...items], total }', '公开接口'),
('POST', '/api/favorites', '添加收藏', ARRAY['nodeHashid'], '必须', '{ success: true }', '用户接口'),
('GET', '/api/favorites', '获取收藏列表', ARRAY['page', 'limit'], '必须', '{ success: true, data: [...] }', '用户接口'),
('DELETE', '/api/favorites?id=x', '删除收藏', ARRAY[]::TEXT[], '必须', '{ success: true }', '用户接口'),
('GET', '/api/history', '获取浏览历史', ARRAY['page', 'limit'], '必须', '{ success: true, data: [...] }', '用户接口'),
('DELETE', '/api/history?id=x', '删除历史记录', ARRAY[]::TEXT[], '必须', '{ success: true }', '用户接口')
ON CONFLICT (method, path) DO NOTHING;
