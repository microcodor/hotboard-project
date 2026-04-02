/**
 * 监控 API 路由
 * 提供监控数据和告警管理接口
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  MonitoringManager,
  AlertLevel,
} from '@/lib/monitoring';
import { createLogger } from '@/lib/logger';

const logger = createLogger('monitoring-api');

/**
 * GET /api/monitoring/metrics - 获取监控指标
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    if (type === 'stats') {
      const stats = await MonitoringManager.getSyncStats();
      return NextResponse.json({ data: stats });
    }

    if (type === 'quality') {
      const quality = await MonitoringManager.checkDataQuality();
      return NextResponse.json({ data: quality });
    }

    if (type === 'alerts') {
      const alerts = await MonitoringManager.getActiveAlerts();
      return NextResponse.json({ data: alerts });
    }

    // 默认返回完整指标
    const metrics = await MonitoringManager.getMonitoringMetrics();
    return NextResponse.json({ data: metrics });
  } catch (error) {
    logger.error('获取监控指标失败:', error);
    return NextResponse.json(
      { error: '获取监控指标失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitoring/alerts - 创建告警
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level, title, message, context } = body;

    if (!level || !title || !message) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const alert = await MonitoringManager.createAlert(
      level as AlertLevel,
      title,
      message,
      context
    );

    return NextResponse.json({ data: alert }, { status: 201 });
  } catch (error) {
    logger.error('创建告警失败:', error);
    return NextResponse.json(
      { error: '创建告警失败' },
      { status: 500 }
    );
  }
}
