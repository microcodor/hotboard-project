/**
 * 用户兑换卡密 API
 * POST /api/user/redeem
 */
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pool from '@/lib/db-pg'

const JWT_SECRET = process.env.JWT_SECRET || 'hotboard-secret-2026'

export async function POST(request: NextRequest) {
  const client = await pool.connect()
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })
    const { userId } = jwt.verify(token, JWT_SECRET) as { userId: number }

    const { code } = await request.json()
    if (!code?.trim()) return NextResponse.json({ success: false, error: '请输入卡密' }, { status: 400 })

    await client.query('BEGIN')

    // 锁定卡密行，防并发
    const cardRes = await client.query(
      "SELECT * FROM card_keys WHERE code = $1 AND status = 'unused' FOR UPDATE",
      [code.trim().toUpperCase()]
    )
    if (cardRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ success: false, error: '卡密无效或已被使用' }, { status: 400 })
    }

    const card = cardRes.rows[0]

    let message = ''

    if (card.type === 'credits') {
      // 充值点数
      await client.query(
        `INSERT INTO credits (user_id, balance, total_purchased, updated_at)
         VALUES ($1, $2, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE
         SET balance = credits.balance + $2,
             total_purchased = credits.total_purchased + $2,
             updated_at = NOW()`,
        [userId, card.credits_amount]
      )
      message = `成功充值 ${card.credits_amount} 点数`

    } else if (card.type === 'plan_monthly' || card.type === 'plan_yearly') {
      // 开通/续期套餐
      const now = new Date()

      // 查当前有效订阅
      const subRes = await client.query(
        "SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' FOR UPDATE",
        [userId]
      )

      let newExpiry: Date
      if (subRes.rows.length > 0) {
        const current = subRes.rows[0]
        const currentPlanRes = await client.query('SELECT slug FROM plans WHERE id = $1', [current.plan_id])
        const currentSlug = currentPlanRes.rows[0]?.slug

        if (current.expires_at && new Date(current.expires_at) > now) {
          // 当前套餐未过期：同套餐续期，不同套餐升级（从今天起算）
          const base = currentSlug === (await client.query('SELECT slug FROM plans WHERE id = $1', [card.plan_id])).rows[0]?.slug
            ? new Date(current.expires_at)
            : now
          newExpiry = new Date(base.getTime() + card.duration_days * 86400000)
        } else {
          newExpiry = new Date(now.getTime() + card.duration_days * 86400000)
        }

        await client.query(
          `UPDATE subscriptions SET plan_id = $1, status = 'active', expires_at = $2, updated_at = NOW()
           WHERE user_id = $3`,
          [card.plan_id, newExpiry, userId]
        )
      } else {
        newExpiry = new Date(now.getTime() + card.duration_days * 86400000)
        await client.query(
          `INSERT INTO subscriptions (user_id, plan_id, status, expires_at, created_at, updated_at)
           VALUES ($1, $2, 'active', $3, NOW(), NOW())`,
          [userId, card.plan_id, newExpiry]
        )
      }

      const planRes = await client.query('SELECT name FROM plans WHERE id = $1', [card.plan_id])
      const planName = planRes.rows[0]?.name || '套餐'
      message = `成功开通 ${planName}，有效期至 ${newExpiry.toLocaleDateString('zh-CN')}`
    }

    // 标记卡密已使用
    await client.query(
      "UPDATE card_keys SET status = 'used', used_by = $1, used_at = NOW() WHERE id = $2",
      [userId, card.id]
    )

    await client.query('COMMIT')

    return NextResponse.json({ success: true, message, type: card.type })
  } catch (e: any) {
    await client.query('ROLLBACK')
    console.error('[API] /api/user/redeem error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  } finally {
    client.release()
  }
}
