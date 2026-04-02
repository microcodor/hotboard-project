/**
 * Cron 定时任务路由 - 数据同步
 * 用于 Vercel Cron Jobs 定时触发数据同步
 */

import { NextRequest, NextResponse } from 'next/server';
import { crawlAll } from '@/scripts/crawl-core';
import { SnapshotManager } from '@/lib/snapshots';
import { createLogger } from '@/lib/logger';
import { createServerClient } from '@/lib/supabase';

const logger = createLogger('cron-sync');
const supabase = createServerClient();

/**
 * 验证 Cron 请求
 */
function verifyCronRequest(request: NextRequest): boolean {
  // 检查 Authorization 头
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.warn('未配置 CRON_SECRET，跳过验证');
    return true; // 开发环境允许
  }

  if (!authHeader) {
    logger.warn('缺少 Authorization 头');
    return false;
  }

  const expectedAuth = `Bearer ${cronSecret}`;
  return authHeader === expectedAuth;
}

/**
 * GET 处理器 - 完整同步
 */
export async function GET(request: NextRequest) {
  try {
    // 验证请求
    if (!verifyCronRequest(request)) {
      logger.warn('Cron 请求验证失败');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('开始 Cron 定时同步任务');

    // 执行完整同步
    // 使用本地抓取（不依赖 TopHub API）
    const result = await crawlAll();
    // 转换为兼容格式
    const converted = {
      success: result.filter(r => r.success).length > 0,
      synced: result.filter(r => r.success).length,
      failed: result.filter(r => !r.success).length,
      skipped: 0,
      errors: result.filter(r => !r.success).map(r => ({ hashid: r.name, error: r.error || 'unknown', retries: 0 })),
      startTime: Date.now() - 60000,
      endTime: Date.now(),
      duration: 0,
      syncId: 'cron-' + Date.now()
    };

    // 记录 Cron 执行
    await recordCronExecution('sync_all', result);

    logger.info(`Cron 同步完成: ${converted.synced} 成功, ${converted.failed} 失败`);

    return NextResponse.json({
      success: converted.success,
      message: 'Cron 同步任务完成',
      syncId: converted.syncId,
      synced: converted.synced,
      failed: converted.failed,
      skipped: result.skipped,
      duration: result.duration,
      errors: converted.errors.slice(0, 5), // 只返回前 5 个错误
    });
  } catch (error) {
    logger.error('Cron 同步任务失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

/**
 * POST 处理器 - 手动触发同步
 */
export async function POST(request: NextRequest) {
  try {
    // 验证请求
    if (!verifyCronRequest(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));

    logger.info('手动触发同步任务', body);

    // 根据参数选择同步模式
    const incremental = body.incremental ?? true;
    const dryRun = body.dryRun ?? false;

    const result = await syncAllNodes({
      maxRetries: body.maxRetries ?? 3,
      retryDelay: body.retryDelay ?? 1000,
      batchSize: body.batchSize ?? 5,
      incremental,
      dryRun,
    });

    await recordCronExecution('sync_manual', result);

    return NextResponse.json({
      success: converted.success,
      message: '同步任务完成',
      syncId: converted.syncId,
      synced: converted.synced,
      failed: converted.failed,
      skipped: result.skipped,
      duration: result.duration,
    });
  } catch (error) {
    logger.error('手动同步任务失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

/**
 * 记录 Cron 执行
 */
async function recordCronExecution(
  taskType: string,
  result: any
): Promise<void> {
  try {
    await supabase.from('cron_executions').insert({
      task_type: taskType,
      sync_id: converted.syncId,
      status: converted.success ? 'success' : 'failed',
      synced_count: converted.synced,
      failed_count: converted.failed,
      skipped_count: result.skipped,
      duration_ms: result.duration,
      error_count: converted.errors.length,
      executed_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.warn('记录 Cron 执行失败:', error);
  }
}
