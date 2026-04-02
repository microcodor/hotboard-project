/**
 * 用户账户信息 API
 * GET /api/user/subscription
 * 返回：余额、累计充值、累计消耗
 */
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pool from '@/lib/db-pg'

const JWT_SECRET = process.env.JWT_SECRET || 'hotboard-secret-2026'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    const { userId } = jwt.verify(token, JWT_SECRET) as { userId: number }

    const r = await pool.query(
      `SELECT balance, total_purchased, total_used, updated_at
       FROM credits WHERE user_id = $1`,
      [userId]
    )
    const c = r.rows[0] || { balance: 0, total_purchased: 0, total_used: 0 }

    return NextResponse.json({
      success: true,
      data: {
        balance:       c.balance,
        totalPurchased: c.total_purchased,
        totalUsed:     c.total_used,
        updatedAt:     c.updated_at,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}
