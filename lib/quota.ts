/**
 * API 次数扣减系统
 * 基于充值余额，不限每日调用次数
 * - 匿名用户：每天 100 次免费（IP 级别）
 * - 登录用户：扣除余额次数
 */
import { NextRequest } from 'next/server'
import pool from '@/lib/db-pg'

export interface QuotaResult {
  allowed: boolean
  balance: number       // 当前余额（登录用户）
  used: number          // 当日已用（匿名用户）
  plan: string
  // 统一格式
  limit: number         // -1=无限，余额数（登录用户）
  remaining: number     // -1=无限
  resetAt: string
}

const FREE_DAILY = 100   // 匿名用户每日免费次数
const FREE_PERIOD_MS = 24 * 60 * 60 * 1000

/** 从请求中提取真实 IP */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

/** 扣减次数（登录用户） */
export async function deductCredits(userId: number, count = 1): Promise<boolean> {
  const r = await pool.query(
    `UPDATE credits SET balance = balance - $2, total_used = total_used + $2, updated_at = NOW()
     WHERE user_id = $1 AND balance >= $2
     RETURNING balance`,
    [userId, count]
  )
  return r.rowCount > 0
}

/** 获取用户余额 */
export async function getCreditBalance(userId: number): Promise<number> {
  const r = await pool.query(`SELECT balance FROM credits WHERE user_id = $1`, [userId])
  return r.rows[0]?.balance ?? 0
}

/** 确保用户有 credits 记录（首次调用时） */
export async function ensureCredits(userId: number): Promise<void> {
  await pool.query(
    `INSERT INTO credits (user_id, balance, total_purchased, total_used)
     VALUES ($1, 0, 0, 0)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  )
}

/** 充值次数到用户账户 */
export async function addCredits(userId: number, amount: number): Promise<void> {
  await pool.query(
    `INSERT INTO credits (user_id, balance, total_purchased, total_used)
     VALUES ($1, $2, $2, 0)
     ON CONFLICT (user_id)
     DO UPDATE SET
       balance = credits.balance + $2,
       total_purchased = credits.total_purchased + $2,
       updated_at = NOW()`,
    [userId, amount]
  )
}

/**
 * 检查并扣减次数
 * 匿名用户：每日 100 次免费（基于 IP + 当日日期做 key）
 * 登录用户：扣除余额
 */
export async function checkAndDeduct(
  userId: number | null,
  ip: string
): Promise<QuotaResult> {
  const now = Date.now()
  const today = new Date().toISOString().slice(0, 10)

  // ── 匿名用户：每日免费次数 ──
  if (!userId) {
    const key = `ip:${ip}:${today}`
    const r = await pool.query(
      `INSERT INTO api_usage (key, date, count)
       VALUES ($1, $2, 1)
       ON CONFLICT (key, date) DO UPDATE SET count = api_usage.count + 1
       RETURNING count`,
      [key, today]
    )
    const used = r.rows[0].count
    const allowed = used <= FREE_DAILY

    return {
      allowed,
      balance: 0,
      used,
      plan: 'free',
      limit: FREE_DAILY,
      remaining: Math.max(0, FREE_DAILY - used),
      resetAt: `${today}T23:59:59+08:00`,
    }
  }

  // ── 登录用户：检查余额 ──
  const key = `user:${userId}:${today}`
  await pool.query(
    `INSERT INTO api_usage (key, date, count)
     VALUES ($1, $2, 1)
     ON CONFLICT (key, date) DO UPDATE SET count = api_usage.count + 1`,
    [key, today]
  )

  const r = await pool.query(`SELECT balance FROM credits WHERE user_id = $1`, [userId])
  const balance = r.rows[0]?.balance ?? 0

  return {
    allowed: true,   // 扣减失败时由调用方判断
    balance,
    used: 0,
    plan: 'paid',
    limit: balance,
    remaining: balance,
    resetAt: `${today}T23:59:59+08:00`,
  }
}
