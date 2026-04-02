/**
 * 数据库类型定义
 * 对应 Supabase 数据库表结构
 */

// ==================== 榜单相关 ====================

/**
 * 榜单分类
 */
export interface Category {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
}

/**
 * 榜单节点
 */
export interface Node {
  id: number;
  hashid: string;
  name: string;
  display: string;
  cid: number; // 分类 ID
  logo: string;
  url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 榜单内容项
 */
export interface NodeItem {
  id: number;
  node_hashid: string;
  title: string;
  description: string | null;
  url: string;
  thumbnail: string | null;
  extra: Record<string, unknown> | null;
  rank: number;
  hot_value: number | null;
  created_at: string;
}

// ==================== 用户相关 ====================

/**
 * 用户档案
 */
export interface Profile {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  favorites: string[]; // 收藏的榜单 hashid 数组
  created_at: string;
  updated_at: string;
}

// ==================== 搜索相关 ====================

/**
 * 搜索记录
 */
export interface SearchLog {
  id: number;
  query: string;
  user_id: string | null;
  results_count: number;
  created_at: string;
}

// ==================== 数据同步相关 ====================

/**
 * 同步任务记录
 */
export interface SyncLog {
  id: number;
  node_hashid: string;
  status: 'pending' | 'success' | 'failed';
  items_count: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

// ==================== 数据库操作结果 ====================

/**
 * 数据库查询结果
 */
export interface DbResult<T> {
  data: T | null;
  error: DbError | null;
  count?: number | null;
}

/**
 * 数据库错误
 */
export interface DbError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

// ==================== 数据库 Row 类型 ====================

/**
 * 榜单数据库行类型
 */
export type NodeRow = {
  id: number;
  hashid: string;
  name: string;
  display: string;
  cid: number;
  logo: string;
  url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * 榜单内容项数据库行类型
 */
export type NodeItemRow = {
  id: number;
  node_hashid: string;
  title: string;
  description: string | null;
  url: string;
  thumbnail: string | null;
  extra: Record<string, unknown> | null;
  rank: number;
  hot_value: number | null;
  created_at: string;
};
