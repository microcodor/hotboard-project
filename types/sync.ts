/**
 * 数据同步相关类型定义
 */

/**
 * 同步状态
 */
export enum SyncStatus {
  PENDING = 'pending',
  STARTED = 'started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

/**
 * 同步记录
 */
export interface SyncRecord {
  id: string;
  sync_id: string;
  hashid: string;
  status: SyncStatus;
  last_synced_at: string;
  item_count: number;
  error?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 同步日志
 */
export interface SyncLog {
  id: string;
  sync_id: string;
  status: SyncStatus;
  started_at: string;
  completed_at?: string;
  synced_count: number;
  failed_count: number;
  skipped_count: number;
  duration_ms: number;
  config?: Record<string, any>;
  errors?: Array<{
    hashid: string;
    error: string;
    retries: number;
  }>;
  error_message?: string;
  error_stack?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 缓存快照
 */
export interface CacheSnapshot {
  id: string;
  hashid: string;
  snapshot_type: 'full' | 'incremental';
  data: Record<string, any>;
  item_count: number;
  created_at: string;
  expires_at: string;
}

/**
 * 同步统计
 */
export interface SyncStats {
  total_syncs: number;
  successful_syncs: number;
  failed_syncs: number;
  total_items_synced: number;
  average_sync_duration_ms: number;
  last_sync_at: string;
  next_sync_at: string;
}
