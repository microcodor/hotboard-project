/**
 * 监控和告警模块
 * 功能：
 * - 同步状态监控
 * - 性能指标收集
 * - 错误率告警
 * - 数据质量检查
 */

import { createServerClient } from './supabase';
import { createLogger } from './logger';
import type { SyncLog, SyncStats } from '@/types/sync';

const logger = createLogger('monitoring');
const supabase = createServerClient();

/**
 * 告警级别
 */
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * 告警
 */
export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  context?: Record<string, any>;
  created_at: string;
  resolved_at?: string;
}

/**
 * 监控指标
 */
export interface MonitoringMetrics {
  syncStatus: {
    lastSyncTime: string | null;
    lastSyncDuration: number;
    successRate: number;
    failureCount: number;
  };
  performance: {
    avgSyncDuration: number;
    maxSyncDuration: number;
    minSyncDuration: number;
    p95SyncDuration: number;
  };
  dataQuality: {
    totalNodes: number;
    syncedNodes: number;
    failedNodes: number;
    totalItems: number;
    averageItemsPerNode: number;
  };
  alerts: Alert[];
}

/**
 * 监控管理器
 */
export class MonitoringManager {
  /**
   * 获取同步统计
   */
  static async getSyncStats(): Promise<SyncStats | null> {
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      const logs = (data || []) as SyncLog[];

      if (logs.length === 0) {
        return null;
      }

      const successfulSyncs = logs.filter((log) => log.status === 'completed');
      const totalItemsSynced = logs.reduce(
        (sum, log) => sum + (log.synced_count || 0),
        0
      );
      const durations = logs
        .filter((log) => log.duration_ms)
        .map((log) => log.duration_ms);

      const avgDuration =
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0;

      const lastSync = logs[0];
      const nextSyncTime = new Date(lastSync.started_at);
      nextSyncTime.setHours(nextSyncTime.getHours() + 6); // 假设每 6 小时同步一次

      return {
        total_syncs: logs.length,
        successful_syncs: successfulSyncs.length,
        failed_syncs: logs.filter((log) => log.status === 'failed').length,
        total_items_synced: totalItemsSynced,
        average_sync_duration_ms: avgDuration,
        last_sync_at: lastSync.started_at,
        next_sync_at: nextSyncTime.toISOString(),
      };
    } catch (error) {
      logger.error('获取同步统计失败:', error);
      return null;
    }
  }

  /**
   * 获取监控指标
   */
  static async getMonitoringMetrics(): Promise<MonitoringMetrics> {
    try {
      const stats = await this.getSyncStats();
      const alerts = await this.getActiveAlerts();

      // 获取数据质量指标
      const { data: nodeData } = await supabase
        .from('nodes')
        .select('count', { count: 'exact' });

      const { data: itemData } = await supabase
        .from('node_items')
        .select('count', { count: 'exact' });

      const { data: syncRecords } = await supabase
        .from('sync_records')
        .select('item_count');

      const totalNodes = nodeData?.length || 0;
      const totalItems = itemData?.length || 0;
      const avgItemsPerNode =
        totalNodes > 0 ? totalItems / totalNodes : 0;

      // 获取性能指标
      const { data: logs } = await supabase
        .from('sync_logs')
        .select('duration_ms')
        .order('started_at', { ascending: false })
        .limit(100);

      const durations = (logs || [])
        .map((log: any) => log.duration_ms)
        .filter((d: number) => d > 0)
        .sort((a: number, b: number) => a - b);

      const p95Index = Math.floor(durations.length * 0.95);

      return {
        syncStatus: {
          lastSyncTime: stats?.last_sync_at || null,
          lastSyncDuration: stats?.average_sync_duration_ms || 0,
          successRate:
            stats && stats.total_syncs > 0
              ? stats.successful_syncs / stats.total_syncs
              : 0,
          failureCount: stats?.failed_syncs || 0,
        },
        performance: {
          avgSyncDuration: stats?.average_sync_duration_ms || 0,
          maxSyncDuration: durations.length > 0 ? durations[durations.length - 1] : 0,
          minSyncDuration: durations.length > 0 ? durations[0] : 0,
          p95SyncDuration: durations.length > 0 ? durations[p95Index] : 0,
        },
        dataQuality: {
          totalNodes,
          syncedNodes: (syncRecords || []).length,
          failedNodes: totalNodes - (syncRecords || []).length,
          totalItems,
          averageItemsPerNode,
        },
        alerts,
      };
    } catch (error) {
      logger.error('获取监控指标失败:', error);
      return {
        syncStatus: {
          lastSyncTime: null,
          lastSyncDuration: 0,
          successRate: 0,
          failureCount: 0,
        },
        performance: {
          avgSyncDuration: 0,
          maxSyncDuration: 0,
          minSyncDuration: 0,
          p95SyncDuration: 0,
        },
        dataQuality: {
          totalNodes: 0,
          syncedNodes: 0,
          failedNodes: 0,
          totalItems: 0,
          averageItemsPerNode: 0,
        },
        alerts: [],
      };
    }
  }

  /**
   * 创建告警
   */
  static async createAlert(
    level: AlertLevel,
    title: string,
    message: string,
    context?: Record<string, any>
  ): Promise<Alert> {
    try {
      const alert: Alert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        level,
        title,
        message,
        context,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('alerts').insert(alert);

      if (error) {
        throw error;
      }

      logger.warn(`告警已创建 [${level}]: ${title}`);

      // 如果是严重告警，发送通知
      if (level === AlertLevel.CRITICAL) {
        await this.sendNotification(alert);
      }

      return alert;
    } catch (error) {
      logger.error('创建告警失败:', error);
      throw error;
    }
  }

  /**
   * 获取活跃告警
   */
  static async getActiveAlerts(): Promise<Alert[]> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      return (data || []) as Alert[];
    } catch (error) {
      logger.error('获取活跃告警失败:', error);
      return [];
    }
  }

  /**
   * 解决告警
   */
  static async resolveAlert(alertId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) {
        throw error;
      }

      logger.info(`告警已解决: ${alertId}`);
    } catch (error) {
      logger.error('解决告警失败:', error);
    }
  }

  /**
   * 检查数据质量
   */
  static async checkDataQuality(): Promise<{
    isHealthy: boolean;
    issues: string[];
  }> {
    try {
      const issues: string[] = [];

      // 检查最后同步时间
      const { data: lastSync } = await supabase
        .from('sync_logs')
        .select('started_at')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (lastSync) {
        const lastSyncTime = new Date(lastSync.started_at).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        if (now - lastSyncTime > oneDay) {
          issues.push('最后同步时间超过 24 小时');
        }
      }

      // 检查失败率
      const { data: recentLogs } = await supabase
        .from('sync_logs')
        .select('status')
        .order('started_at', { ascending: false })
        .limit(10);

      if (recentLogs && recentLogs.length > 0) {
        const failureCount = recentLogs.filter(
          (log: any) => log.status === 'failed'
        ).length;
        const failureRate = failureCount / recentLogs.length;

        if (failureRate > 0.5) {
          issues.push(`最近 10 次同步失败率过高: ${(failureRate * 100).toFixed(1)}%`);
        }
      }

      // 检查数据完整性
      const { data: nodes } = await supabase
        .from('nodes')
        .select('count', { count: 'exact' });

      const { data: syncRecords } = await supabase
        .from('sync_records')
        .select('count', { count: 'exact' });

      const totalNodes = nodes?.length || 0;
      const syncedNodes = syncRecords?.length || 0;

      if (totalNodes > 0 && syncedNodes / totalNodes < 0.8) {
        issues.push(
          `数据覆盖率不足: ${((syncedNodes / totalNodes) * 100).toFixed(1)}%`
        );
      }

      return {
        isHealthy: issues.length === 0,
        issues,
      };
    } catch (error) {
      logger.error('数据质量检查失败:', error);
      return {
        isHealthy: false,
        issues: ['数据质量检查异常'],
      };
    }
  }

  /**
   * 发送通知
   */
  private static async sendNotification(alert: Alert): Promise<void> {
    try {
      // 这里可以集成邮件、Slack、钉钉等通知服务
      logger.info(`发送通知: ${alert.title}`);

      // 示例：发送到 Slack
      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 ${alert.title}`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*${alert.title}*\n${alert.message}`,
                },
              },
            ],
          }),
        });
      }
    } catch (error) {
      logger.warn('发送通知失败:', error);
    }
  }
}

/**
 * 导出便利函数
 */
export async function getSyncStats(): Promise<SyncStats | null> {
  return MonitoringManager.getSyncStats();
}

export async function getMonitoringMetrics(): Promise<MonitoringMetrics> {
  return MonitoringManager.getMonitoringMetrics();
}

export async function checkDataQuality(): Promise<{
  isHealthy: boolean;
  issues: string[];
}> {
  return MonitoringManager.checkDataQuality();
}
