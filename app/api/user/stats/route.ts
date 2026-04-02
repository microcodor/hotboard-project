/**
 * 用户统计 API
 * GET /api/user/stats
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

    const [favRes, histRes, userRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM favorites WHERE user_id = $1', [userId]),
      pool.query('SELECT COUNT(*) FROM browse_history WHERE user_id = $1', [userId]),
      pool.query('SELECT created_at FROM users WHERE id = $1', [userId]),
    ])

    const joinedDays = userRes.rows[0]
      ? Math.floor((Date.now() - new Date(userRes.rows[0].created_at).getTime()) / 86400000)
      : 0

    return NextResponse.json({
      success: true,
      stats: {
        favorites_count: parseInt(favRes.rows[0].count),
        history_count: parseInt(histRes.rows[0].count),
        total_views: parseInt(histRes.rows[0].count), // 浏览次数 = 历史记录数
        joined_days: joinedDays,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}
