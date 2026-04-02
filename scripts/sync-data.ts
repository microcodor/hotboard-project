/**
 * 数据同步脚本 - Day 2 增强版
 * 功能：
 * - 获取所有榜单列表
 * - 遍历获取榜单内容
 * - 保存到 Supabase 数据库
 * - 错误处理和重试机制
 * - 增量同步支持
 * - 同步状态记录
 */

import { createServerClient } from '@/lib/supabase';
import { getTopHubClient } from '@/lib/tophub';
import { createLogger } from '@/lib/logger';
import { SyncStatus, SyncRecord } from '@/types/sync';

const logger = createLogger('sync-data');

/**
 * 同步结果
 */
export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  skipped: number;
  errors: Array<{
    hashid: string;
    error: string;
    retries: number;
  }>;
  startTime: number;
  endTime: number;
  duration: number;
  syncId: string;
}

/**
 * 同步配置
 */
interface SyncConfig {
  maxRetries?: number;
  retryDelay?: number;
  batchSize?: number;
  incremental?: boolean;
  dryRun?: boolean;
}

/**
 * 数据同步管理器
 */
export class DataSyncManager {
  private supabase = createServerClient();
  private topHub = getTopHubClient();
  private config: Required<SyncConfig>;
  private syncId: string;

  constructor(config: SyncConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      batchSize: config.batchSize ?? 5,
      incremental: config.incremental ?? true,
      dryRun: config.dryRun ?? false,
    };
    this.syncId = this.generateSyncId();
  }

  /**
   * 生成同步 ID
   */
  private generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 执行完整同步
   */
  async syncAll(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      synced: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      startTime,
      endTime: 0,
      duration: 0,
      syncId: this.syncId,
    };

    try {
      logger.info(`开始数据同步 [${this.syncId}]`);

      // 1. 记录同步开始
      await this.recordSyncStart();

      // 2. 获取所有榜单列表
      logger.info('获取榜单列表...');
      const nodes = await this.topHub.getNodes();
      logger.info(`获取到 ${nodes.length} 个榜单`);

      if (nodes.length === 0) {
        logger.warn('未获取到任何榜单');
        result.success = true;
        return result;
      }

      // 3. 同步榜单元数据
      logger.info('同步榜单元数据...');
      await this.syncNodeMetadata(nodes);

      // 4. 同步榜单内容
      logger.info('同步榜单内容...');
      const syncResults = await this.syncNodeContents(nodes);

      result.synced = syncResults.synced;
      result.failed = syncResults.failed;
      result.skipped = syncResults.skipped;
      result.errors = syncResults.errors;

      // 5. 记录同步完成
      result.endTime = Date.now();
      result.duration = result.endTime - startTime;
      result.success = result.failed === 0;

      await this.recordSyncComplete(result);

      logger.info(
        `同步完成 [${this.syncId}]: 成功=${result.synced}, 失败=${result.failed}, 跳过=${result.skipped}, 耗时=${result.duration}ms`
      );

      return result;
    } catch (error) {
      result.endTime = Date.now();
      result.duration = result.endTime - startTime;
      logger.error(`同步失败 [${this.syncId}]:`, error);

      await this.recordSyncError(error as Error);

      return result;
    }
  }

  /**
   * 同步榜单元数据
   */
  private async syncNodeMetadata(nodes: any[]): Promise<void> {
    if (this.config.dryRun) {
      logger.info('[DRY RUN] 跳过元数据同步');
      return;
    }

    try {
      const nodeRecords = nodes.map((node) => ({
        hashid: node.hashid,
        name: node.name,
        url: node.url,
        logo: node.logo,
        category_id: node.cid.toString(),
        category_name: node.cname,
        sort_order: node.sort_order,
        display: node.display || node.name,
        source_type: 'tophub',
        updated_at: new Date().toISOString(),
      }));

      // 批量插入或更新
      const { error } = await this.supabase
        .from('nodes')
        .upsert(nodeRecords, { onConflict: 'hashid' });

      if (error) {
        throw new Error(`元数据同步失败: ${error.message}`);
      }

      logger.info(`元数据同步完成: ${nodeRecords.length} 条记录`);
    } catch (error) {
      logger.error('元数据同步失败:', error);
      throw error;
    }
  }

  /**
   * 同步榜单内容
   */
  private async syncNodeContents(nodes: any[]): Promise<{
    synced: number;
    failed: number;
    skipped: number;
    errors: SyncResult['errors'];
  }> {
    const results = {
      synced: 0,
      failed: 0,
      skipped: 0,
      errors: [] as SyncResult['errors'],
    };

    // 分批处理
    for (let i = 0; i < nodes.length; i += this.config.batchSize) {
      const batch = nodes.slice(i, i + this.config.batchSize);

      const promises = batch.map((node) =>
        this.syncNodeWithRetry(node, results)
      );

      await Promise.all(promises);

      // 批次间延迟
      if (i + this.config.batchSize < nodes.length) {
        await this.sleep(500);
      }
    }

    return results;
  }

  /**
   * 带重试的单个榜单同步
   */
  private async syncNodeWithRetry(
    node: any,
    results: any
  ): Promise<void> {
    let lastError: Error | null = null;
    let retries = 0;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // 检查是否需要跳过（增量同步）
        if (this.config.incremental) {
          const shouldSkip = await this.shouldSkipNode(node.hashid);
          if (shouldSkip) {
            logger.debug(`跳过榜单: ${node.name} (${node.hashid})`);
            results.skipped++;
            return;
          }
        }

        // 获取榜单详情
        logger.debug(`同步榜单: ${node.name} (${node.hashid})`);
        const nodeDetail = await this.topHub.getNodeDetail(node.hashid);

        if (!nodeDetail || !nodeDetail.list) {
          throw new Error('未获取到榜单内容');
        }

        // 保存到数据库
        if (!this.config.dryRun) {
          await this.saveNodeItems(node.hashid, nodeDetail.list);
        }

        logger.info(
          `✓ 同步成功: ${node.name} (${nodeDetail.list.length} 条数据)`
        );
        results.synced++;
        return;
      } catch (error) {
        lastError = error as Error;
        retries = attempt;

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          logger.warn(
            `同步失败，${delay}ms 后重试 (${attempt + 1}/${this.config.maxRetries}): ${node.hashid}`
          );
          await this.sleep(delay);
        }
      }
    }

    // 所有重试都失败
    results.failed++;
    results.errors.push({
      hashid: node.hashid,
      error: lastError?.message || '未知错误',
      retries,
    });

    logger.error(
      `✗ 同步失败: ${node.name} (${node.hashid}) - ${lastError?.message}`
    );
  }

  /**
   * 检查是否应该跳过该榜单（增量同步）
   */
  private async shouldSkipNode(hashid: string): Promise<boolean> {
    try {
      // 查询最后一次同步时间
      const { data, error } = await this.supabase
        .from('sync_records')
        .select('last_synced_at')
        .eq('hashid', hashid)
        .order('last_synced_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return false; // 首次同步
      }

      // 如果距离上次同步不到 1 小时，则跳过
      const lastSyncTime = new Date(data.last_synced_at).getTime();
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      return now - lastSyncTime < oneHour;
    } catch (error) {
      logger.debug(`检查跳过条件失败: ${hashid}`, error);
      return false;
    }
  }

  /**
   * 保存榜单项目到数据库
   */
  private async saveNodeItems(hashid: string, items: any[]): Promise<void> {
    try {
      const itemRecords = items.map((item, index) => ({
        hashid,
        item_id: item.id,
        title: item.title,
        url: item.url,
        hot_value: item.hot_value,
        rank: index + 1,
        thumbnail: item.thumbnail || null,
        description: item.description || null,
        extra: item.extra || null,
        synced_at: new Date().toISOString(),
      }));

      // 先删除旧数据
      await this.supabase.from('node_items').delete().eq('hashid', hashid);

      // 插入新数据
      const { error } = await this.supabase
        .from('node_items')
        .insert(itemRecords);

      if (error) {
        throw new Error(`保存项目失败: ${error.message}`);
      }

      // 更新同步记录
      await this.updateSyncRecord(hashid, items.length);
    } catch (error) {
      logger.error(`保存项目失败 [${hashid}]:`, error);
      throw error;
    }
  }

  /**
   * 更新同步记录
   */
  private async updateSyncRecord(
    hashid: string,
    itemCount: number
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from('sync_records').upsert(
        {
          hashid,
          sync_id: this.syncId,
          last_synced_at: new Date().toISOString(),
          item_count: itemCount,
          status: 'success',
        },
        { onConflict: 'hashid' }
      );

      if (error) {
        logger.warn(`更新同步记录失败: ${error.message}`);
      }
    } catch (error) {
      logger.warn('更新同步记录异常:', error);
    }
  }

  /**
   * 记录同步开始
   */
  private async recordSyncStart(): Promise<void> {
    try {
      await this.supabase.from('sync_logs').insert({
        sync_id: this.syncId,
        status: 'started',
        started_at: new Date().toISOString(),
        config: this.config,
      });
    } catch (error) {
      logger.warn('记录同步开始失败:', error);
    }
  }

  /**
   * 记录同步完成
   */
  private async recordSyncComplete(result: SyncResult): Promise<void> {
    try {
      await this.supabase
        .from('sync_logs')
        .update({
          status: result.success ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          synced_count: result.synced,
          failed_count: result.failed,
          skipped_count: result.skipped,
          duration_ms: result.duration,
          errors: result.errors,
        })
        .eq('sync_id', this.syncId);
    } catch (error) {
      logger.warn('记录同步完成失败:', error);
    }
  }

  /**
   * 记录同步错误
   */
  private async recordSyncError(error: Error): Promise<void> {
    try {
      await this.supabase
        .from('sync_logs')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
          error_message: error.message,
          error_stack: error.stack,
        })
        .eq('sync_id', this.syncId);
    } catch (err) {
      logger.warn('记录同步错误失败:', err);
    }
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 导出便利函数
 */
export async function syncAllNodes(
  config?: SyncConfig
): Promise<SyncResult> {
  const manager = new DataSyncManager(config);
  return manager.syncAll();
}

/**
 * 单个榜单同步
 */
export async function syncSingleNode(
  hashid: string,
  config?: SyncConfig
): Promise<boolean> {
  try {
    const manager = new DataSyncManager(config);
    const topHub = getTopHubClient();

    logger.info(`同步单个榜单: ${hashid}`);

    const nodeDetail = await topHub.getNodeDetail(hashid);

    if (!nodeDetail || !nodeDetail.list) {
      logger.error(`未获取到榜单内容: ${hashid}`);
      return false;
    }

    if (!config?.dryRun) {
      await manager['saveNodeItems'](hashid, nodeDetail.list);
    }

    logger.info(`✓ 同步成功: ${nodeDetail.name} (${nodeDetail.list.length} 条数据)`);
    return true;
  } catch (error) {
    logger.error(`同步失败: ${hashid}`, error);
    return false;
  }
}

/**
 * 如果直接运行此脚本
 */
if (require.main === module) {
  const config: SyncConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    batchSize: 5,
    incremental: false, // 完整同步
    dryRun: false,
  };

  syncAllNodes(config)
    .then((result) => {
      console.log('\n========== 同步结果 ==========');
      console.log(`同步 ID: ${result.syncId}`);
      console.log(`成功: ${result.synced}`);
      console.log(`失败: ${result.failed}`);
      console.log(`跳过: ${result.skipped}`);
      console.log(`耗时: ${result.duration}ms`);

      if (result.errors.length > 0) {
        console.log('\n错误列表:');
        result.errors.forEach((err, i) => {
          console.log(
            `${i + 1}. ${err.hashid}: ${err.error} (重试 ${err.retries} 次)`
          );
        });
      }

      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('同步失败:', error);
      process.exit(1);
    });
}
