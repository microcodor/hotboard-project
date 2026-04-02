-- Day 2 数据同步相关表

-- 同步日志表
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'started',
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  synced_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  duration_ms INTEGER,
  config JSONB,
  errors JSONB,
  error_message TEXT,
  error_stack TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX idx_sync_id (sync_id),
  INDEX idx_status (status),
  INDEX idx_started_at (started_at)
);

-- 同步记录表（每个榜单的同步状态）
CREATE TABLE IF NOT EXISTS sync_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hashid VARCHAR(255) NOT NULL UNIQUE,
  sync_id VARCHAR(255),
  last_synced_at TIMESTAMP,
  item_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'success',
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX idx_hashid (hashid),
  INDEX idx_last_synced_at (last_synced_at)
);

-- 缓存快照表
CREATE TABLE IF NOT EXISTS cache_snapshots (
  id VARCHAR(255) PRIMARY KEY,
  hashid VARCHAR(255) NOT NULL,
  snapshot_type VARCHAR(50) NOT NULL DEFAULT 'full',
  data JSONB NOT NULL,
  item_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  INDEX idx_hashid (hashid),
  INDEX idx_created_at (created_at),
  INDEX idx_expires_at (expires_at)
);

-- 告警表
CREATE TABLE IF NOT EXISTS alerts (
  id VARCHAR(255) PRIMARY KEY,
  level VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  INDEX idx_level (level),
  INDEX idx_resolved_at (resolved_at)
);

-- Cron 执行记录表
CREATE TABLE IF NOT EXISTS cron_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type VARCHAR(100) NOT NULL,
  sync_id VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  synced_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_count INTEGER DEFAULT 0,
  executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX idx_task_type (task_type),
  INDEX idx_executed_at (executed_at)
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_sync_logs_status_started_at ON sync_logs(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cache_snapshots_hashid_created_at ON cache_snapshots(hashid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_level_created_at ON alerts(level, created_at DESC);
