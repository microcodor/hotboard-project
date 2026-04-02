/**
 * Cron 定时任务路由 - 数据同步
 * 用于 Vercel Cron Jobs 定时触发数据同步
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncAllNodes } from '@/scripts/sync-data';
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
    const result = await syncAllNodes({
      maxRetries: 3,
      retryDelay: 1000,
      batchSize: 5,
      incremental: false, // Cron 任务执行完整同步
      dryRun: false,
    });

    // 记录 Cron 执行
    await recordCronExecution('sync_all', result);

    logger.info(`Cron 同步完成: ${result.synced} 成功, ${result.failed} 失败`);

    return NextResponse.json({
      success: result.success,
      message: 'Cron 同步任务完成',
      syncId: result.syncId,
      synced: result.synced,
      failed: result.failed,
      skipped: result.skipped,
      duration: result.duration,
      errors: result.errors.slice(0, 5), // 只返回前 5 个错误
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
      success: result.success,
      message: '同步任务完成',
      syncId: result.syncId,
      synced: result.synced,
      failed: result.failed,
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
      sync_id: result.syncId,
      status: result.success ? 'success' : 'failed',
      synced_count: result.synced,
      failed_count: result.failed,
      skipped_count: result.skipped,
      duration_ms: result.duration,
      error_count: result.errors.length,
      executed_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.warn('记录 Cron 执行失败:', error);
  }
}
