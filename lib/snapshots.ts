/**
 * 快照功能模块
 * 功能：
 * - 保存榜单快照
 * - 查询历史快照
 * - 快照对比功能
 */

import { createServerClient } from './supabase';
import { createLogger } from './logger';
import type { CacheSnapshot } from '@/types/sync';

const logger = createLogger('snapshots');
const supabase = createServerClient();

/**
 * 快照对比结果
 */
export interface SnapshotComparison {
  added: Array<{
    rank: number;
    title: string;
    url: string;
    hot_value: number;
  }>;
  removed: Array<{
    rank: number;
    title: string;
    url: string;
    hot_value: number;
  }>;
  changed: Array<{
    title: string;
    oldRank: number;
    newRank: number;
    oldHotValue: number;
    newHotValue: number;
  }>;
}

/**
 * 快照管理器
 */
export class SnapshotManager {
  /**
   * 保存快照
   */
  static async saveSnapshot(
    hashid: string,
    items: any[],
    snapshotType: 'full' | 'incremental' = 'full'
  ): Promise<string> {
    try {
      const snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const snapshot: CacheSnapshot = {
        id: snapshotId,
        hashid,
        snapshot_type: snapshotType,
        data: {
          items: items.map((item, index) => ({
            rank: index + 1,
            title: item.title,
            url: item.url,
            hot_value: item.hot_value,
            thumbnail: item.thumbnail,
            description: item.description,
            extra: item.extra,
          })),
          timestamp: new Date().toISOString(),
          itemCount: items.length,
        },
        item_count: items.length,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 天过期
      };

      const { error } = await supabase
        .from('cache_snapshots')
        .insert(snapshot);

      if (error) {
        throw new Error(`保存快照失败: ${error.message}`);
      }

      logger.info(`快照已保存: ${snapshotId} (${hashid})`);
      return snapshotId;
    } catch (error) {
      logger.error(`保存快照失败 [${hashid}]:`, error);
      throw error;
    }
  }

  /**
   * 获取最新快照
   */
  static async getLatestSnapshot(hashid: string): Promise<CacheSnapshot | null> {
    try {
      const { data, error } = await supabase
        .from('cache_snapshots')
        .select('*')
        .eq('hashid', hashid)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // 没有找到记录
          return null;
        }
        throw error;
      }

      return data as CacheSnapshot;
    } catch (error) {
      logger.error(`获取最新快照失败 [${hashid}]:`, error);
      return null;
    }
  }

  /**
   * 获取快照历史
   */
  static async getSnapshotHistory(
    hashid: string,
    limit: number = 10
  ): Promise<CacheSnapshot[]> {
    try {
      const { data, error } = await supabase
        .from('cache_snapshots')
        .select('*')
        .eq('hashid', hashid)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return (data || []) as CacheSnapshot[];
    } catch (error) {
      logger.error(`获取快照历史失败 [${hashid}]:`, error);
      return [];
    }
  }

  /**
   * 对比两个快照
   */
  static compareSnapshots(
    oldSnapshot: CacheSnapshot,
    newSnapshot: CacheSnapshot
  ): SnapshotComparison {
    const oldItems = oldSnapshot.data.items || [];
    const newItems = newSnapshot.data.items || [];

    const oldTitles = new Set(oldItems.map((item: any) => item.title));
    const newTitles = new Set(newItems.map((item: any) => item.title));

    // 找出新增的项
    const added = newItems.filter(
      (item: any) => !oldTitles.has(item.title)
    );

    // 找出删除的项
    const removed = oldItems.filter(
      (item: any) => !newTitles.has(item.title)
    );

    // 找出排名变化的项
    const changed = [];
    for (const newItem of newItems) {
      const oldItem = oldItems.find(
        (item: any) => item.title === newItem.title
      );
      if (
        oldItem &&
        (oldItem.rank !== newItem.rank ||
          oldItem.hot_value !== newItem.hot_value)
      ) {
        changed.push({
          title: newItem.title,
          oldRank: oldItem.rank,
          newRank: newItem.rank,
          oldHotValue: oldItem.hot_value,
          newHotValue: newItem.hot_value,
        });
      }
    }

    return {
      added: added.slice(0, 10), // 只返回前 10 个
      removed: removed.slice(0, 10),
      changed: changed.slice(0, 10),
    };
  }

  /**
   * 对比最新快照和指定快照
   */
  static async compareWithLatest(
    hashid: string,
    snapshotId: string
  ): Promise<SnapshotComparison | null> {
    try {
      const latest = await this.getLatestSnapshot(hashid);
      if (!latest) {
        logger.warn(`未找到最新快照: ${hashid}`);
        return null;
      }

      const { data, error } = await supabase
        .from('cache_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .single();

      if (error) {
        throw error;
      }

      const snapshot = data as CacheSnapshot;
      return this.compareSnapshots(snapshot, latest);
    } catch (error) {
      logger.error(`快照对比失败 [${hashid}]:`, error);
      return null;
    }
  }

  /**
   * 获取快照统计
   */
  static async getSnapshotStats(hashid: string): Promise<{
    totalSnapshots: number;
    oldestSnapshot: CacheSnapshot | null;
    newestSnapshot: CacheSnapshot | null;
    averageItemCount: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('cache_snapshots')
        .select('*')
        .eq('hashid', hashid)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      const snapshots = (data || []) as CacheSnapshot[];

      if (snapshots.length === 0) {
        return {
          totalSnapshots: 0,
          oldestSnapshot: null,
          newestSnapshot: null,
          averageItemCount: 0,
        };
      }

      const itemCounts = snapshots.map((s) => s.item_count);
      const averageItemCount =
        itemCounts.reduce((a, b) => a + b, 0) / itemCounts.length;

      return {
        totalSnapshots: snapshots.length,
        oldestSnapshot: snapshots[0],
        newestSnapshot: snapshots[snapshots.length - 1],
        averageItemCount,
      };
    } catch (error) {
      logger.error(`获取快照统计失败 [${hashid}]:`, error);
      return {
        totalSnapshots: 0,
        oldestSnapshot: null,
        newestSnapshot: null,
        averageItemCount: 0,
      };
    }
  }

  /**
   * 删除过期快照
   */
  static async deleteExpiredSnapshots(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('cache_snapshots')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        throw error;
      }

      logger.info(`删除过期快照: ${data?.length || 0} 项`);
      return data?.length || 0;
    } catch (error) {
      logger.error('删除过期快照失败:', error);
      return 0;
    }
  }

  /**
   * 清理旧快照（保留最近 N 个）
   */
  static async cleanupOldSnapshots(
    hashid: string,
    keepCount: number = 30
  ): Promise<number> {
    try {
      const { data: snapshots, error: selectError } = await supabase
        .from('cache_snapshots')
        .select('id')
        .eq('hashid', hashid)
        .order('created_at', { ascending: false })
        .offset(keepCount);

      if (selectError) {
        throw selectError;
      }

      if (!snapshots || snapshots.length === 0) {
        return 0;
      }

      const idsToDelete = snapshots.map((s: any) => s.id);

      const { error: deleteError } = await supabase
        .from('cache_snapshots')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        throw deleteError;
      }

      logger.info(`清理旧快照 [${hashid}]: 删除 ${idsToDelete.length} 项`);
      return idsToDelete.length;
    } catch (error) {
      logger.error(`清理旧快照失败 [${hashid}]:`, error);
      return 0;
    }
  }
}

/**
 * 导出便利函数
 */
export async function saveSnapshot(
  hashid: string,
  items: any[],
  type?: 'full' | 'incremental'
): Promise<string> {
  return SnapshotManager.saveSnapshot(hashid, items, type);
}

export async function getLatestSnapshot(
  hashid: string
): Promise<CacheSnapshot | null> {
  return SnapshotManager.getLatestSnapshot(hashid);
}

export async function getSnapshotHistory(
  hashid: string,
  limit?: number
): Promise<CacheSnapshot[]> {
  return SnapshotManager.getSnapshotHistory(hashid, limit);
}

export async function compareSnapshots(
  hashid: string,
  snapshotId: string
): Promise<SnapshotComparison | null> {
  return SnapshotManager.compareWithLatest(hashid, snapshotId);
}

export async function getSnapshotStats(hashid: string) {
  return SnapshotManager.getSnapshotStats(hashid);
}
