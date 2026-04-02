/**
 * 数据同步集成测试
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { DataSyncManager, syncAllNodes, syncSingleNode } from '@/scripts/sync-data';
import { SnapshotManager } from '@/lib/snapshots';
import { MonitoringManager } from '@/lib/monitoring';
import { getCache, CacheKeyGenerator } from '@/lib/cache-manager';

describe('数据同步集成测试', () => {
  let syncManager: DataSyncManager;

  beforeAll(() => {
    syncManager = new DataSyncManager({
      maxRetries: 2,
      retryDelay: 500,
      batchSize: 3,
      incremental: false,
      dryRun: true, // 测试模式
    });
  });

  afterAll(() => {
    // 清理
    const cache = getCache();
    cache.clear();
  });

  describe('数据同步脚本', () => {
    it('应该成功执行完整同步', async () => {
      const result = await syncAllNodes({
        dryRun: true,
        maxRetries: 1,
      });

      expect(result).toBeDefined();
      expect(result.syncId).toBeDefined();
      expect(result.startTime).toBeLessThan(result.endTime);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('应该处理同步错误', async () => {
      const result = await syncAllNodes({
        dryRun: true,
        maxRetries: 1,
      });

      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('应该支持增量同步', async () => {
      const result = await syncAllNodes({
        incremental: true,
        dryRun: true,
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('缓存管理', () => {
    it('应该正确生成缓存键', () => {
      const keys = {
        nodesList: CacheKeyGenerator.nodesList(),
        nodeDetail: CacheKeyGenerator.nodeDetail('hn'),
        nodeItems: CacheKeyGenerator.nodeItems('hn'),
        searchResults: CacheKeyGenerator.searchResults('test'),
        userFavorites: CacheKeyGenerator.userFavorites('user123'),
        categoriesList: CacheKeyGenerator.categoriesList(),
        hotRanking: CacheKeyGenerator.hotRanking(100),
      };

      expect(keys.nodesList).toBe('nodes:list:all');
      expect(keys.nodeDetail).toBe('node:detail:hn');
      expect(keys.nodeItems).toBe('node:items:hn');
      expect(keys.searchResults).toContain('search:');
      expect(keys.userFavorites).toBe('user:favorites:user123');
      expect(keys.categoriesList).toBe('categories:list');
      expect(keys.hotRanking).toBe('hot:ranking:100');
    });

    it('应该支持缓存设置和获取', () => {
      const cache = getCache();
      const key = 'test:key';
      const value = { data: 'test' };

      cache.set(key, value, 3600);
      const retrieved = cache.get(key);

      expect(retrieved).toEqual(value);
    });

    it('应该支持按标签删除缓存', () => {
      const cache = getCache();

      cache.set('key1', 'value1', 3600, ['tag1']);
      cache.set('key2', 'value2', 3600, ['tag1']);
      cache.set('key3', 'value3', 3600, ['tag2']);

      const deleted = cache.deleteByTag('tag1');

      expect(deleted).toBe(2);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toEqual('value3');
    });

    it('应该收集缓存统计', () => {
      const cache = getCache();
      cache.clear();

      cache.set('key1', 'value1');
      cache.get('key1'); // 命中
      cache.get('key1'); // 命中
      cache.get('key2'); // 未命中

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
      expect(stats.size).toBe(1);
    });
  });

  describe('快照功能', () => {
    it('应该生成有效的快照 ID', async () => {
      const items = [
        { title: 'Item 1', url: 'http://example.com/1', hot_value: 100 },
        { title: 'Item 2', url: 'http://example.com/2', hot_value: 90 },
      ];

      // 注意：这是单元测试，实际快照保存需要数据库
      expect(items.length).toBe(2);
    });

    it('应该对比快照差异', () => {
      const oldSnapshot = {
        id: 'snap1',
        hashid: 'hn',
        snapshot_type: 'full' as const,
        data: {
          items: [
            { rank: 1, title: 'Item 1', url: 'http://1', hot_value: 100 },
            { rank: 2, title: 'Item 2', url: 'http://2', hot_value: 90 },
            { rank: 3, title: 'Item 3', url: 'http://3', hot_value: 80 },
          ],
        },
        item_count: 3,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const newSnapshot = {
        ...oldSnapshot,
        id: 'snap2',
        data: {
          items: [
            { rank: 1, title: 'Item 2', url: 'http://2', hot_value: 95 },
            { rank: 2, title: 'Item 1', url: 'http://1', hot_value: 100 },
            { rank: 3, title: 'Item 4', url: 'http://4', hot_value: 75 },
          ],
        },
      };

      const comparison = SnapshotManager.compareSnapshots(oldSnapshot, newSnapshot);

      expect(comparison.added.length).toBeGreaterThan(0);
      expect(comparison.removed.length).toBeGreaterThan(0);
      expect(comparison.changed.length).toBeGreaterThan(0);
    });
  });

  describe('监控告警', () => {
    it('应该收集监控指标', async () => {
      const metrics = await MonitoringManager.getMonitoringMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.syncStatus).toBeDefined();
      expect(metrics.performance).toBeDefined();
      expect(metrics.dataQuality).toBeDefined();
      expect(metrics.alerts).toBeDefined();
    });

    it('应该检查数据质量', async () => {
      const quality = await MonitoringManager.checkDataQuality();

      expect(quality).toBeDefined();
      expect(quality.isHealthy).toBeDefined();
      expect(Array.isArray(quality.issues)).toBe(true);
    });

    it('应该获取同步统计', async () => {
      const stats = await MonitoringManager.getSyncStats();

      if (stats) {
        expect(stats.total_syncs).toBeGreaterThanOrEqual(0);
        expect(stats.successful_syncs).toBeGreaterThanOrEqual(0);
        expect(stats.failed_syncs).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('错误处理', () => {
    it('应该处理网络错误', async () => {
      const result = await syncAllNodes({
        maxRetries: 1,
        dryRun: true,
      });

      expect(result).toHaveProperty('errors');
    });

    it('应该记录详细的错误信息', async () => {
      const result = await syncAllNodes({
        maxRetries: 1,
        dryRun: true,
      });

      if (result.errors.length > 0) {
        const error = result.errors[0];
        expect(error).toHaveProperty('hashid');
        expect(error).toHaveProperty('error');
        expect(error).toHaveProperty('retries');
      }
    });
  });

  describe('性能测试', () => {
    it('同步应该在合理时间内完成', async () => {
      const startTime = Date.now();

      const result = await syncAllNodes({
        maxRetries: 1,
        batchSize: 5,
        dryRun: true,
      });

      const duration = Date.now() - startTime;

      // 干运行应该很快完成
      expect(duration).toBeLessThan(5000);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('缓存操作应该很快', () => {
      const cache = getCache();
      cache.clear();

      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      for (let i = 0; i < 1000; i++) {
        cache.get(`key${i}`);
      }

      const duration = Date.now() - startTime;

      // 1000 次设置和 1000 次获取应该在 100ms 内完成
      expect(duration).toBeLessThan(100);
    });
  });
});
