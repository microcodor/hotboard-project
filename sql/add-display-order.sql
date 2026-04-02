-- 添加 display_order 字段用于首页排序
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_nodes_display_order ON nodes(display_order);

-- 初始化排序（按分类和名称）
UPDATE nodes SET display_order = id;
