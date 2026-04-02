/**
 * API 限流中间件
 * 基于套餐配额，按用户+日期统计调用次数
 * 使用 PostgreSQL 存储（api_usage 表）
 */
import { NextRequest } from 'next/server'
import pool from '@/lib/db-pg'

// 套餐每日限额
const PLAN_LIMITS: Record<string, number> = {
  free:       100,
  basic:      5000,
  pro:        50000,
  enterprise: Infinity,
}

export interface RateLimitResult {
  allowed: boolean
  plan: string
  limit: number
  used: number
  remaining: number
  resetAt: string   // 今日 23:59:59
}

/**
 * 检查并记录 API 调用
 * @param userId  已登录用户 ID（null = 匿名，按 IP 限流）
 * @param ip      请求 IP（匿名时使用）
 */
export async function checkRateLimit(
  userId: number | null,
  ip: string
): Promise<RateLimitResult> {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const resetAt = `${today}T23:59:59+08:00`

  // 匿名用户：按 IP，固定 free 配额
  if (!userId) {
    const key = `ip:${ip}`
    const used = await incrementUsage(key, today)
    const limit = PLAN_LIMITS.free
    return {
      allowed: used <= limit,
      plan: 'free',
      limit,
      used,
      remaining: Math.max(0, limit - used),
      resetAt,
    }
  }

  // 已登录用户：查套餐
  const planRow = await pool.query(
    `SELECT p.slug, p.daily_limit
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = $1 AND s.status = 'active'
       AND (s.expires_at IS NULL OR s.expires_at > NOW())
     ORDER BY p.daily_limit DESC NULLS LAST
     LIMIT 1`,
    [userId]
  )

  const planSlug  = planRow.rows[0]?.slug       || 'free'
  const planLimit = planRow.rows[0]?.daily_limit ?? PLAN_LIMITS.free
  const limit     = planLimit === null ? Infinity : planLimit

  const key  = `user:${userId}`
  const used = await incrementUsage(key, today)

  return {
    allowed: limit === Infinity || used <= limit,
    plan: planSlug,
    limit: limit === Infinity ? -1 : limit,
    used,
    remaining: limit === Infinity ? -1 : Math.max(0, limit - used),
    resetAt,
  }
}

/** 原子递增使用量，返回递增后的值 */
async function incrementUsage(key: string, date: string): Promise<number> {
  const r = await pool.query(
    `INSERT INTO api_usage (key, date, count)
     VALUES ($1, $2, 1)
     ON CONFLICT (key, date) DO UPDATE SET count = api_usage.count + 1
     RETURNING count`,
    [key, date]
  )
  return r.rows[0].count
}

/** 从请求中提取真实 IP */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}
