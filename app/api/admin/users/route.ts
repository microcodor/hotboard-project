/**
 * 管理后台 - 用户管理 API
 * GET    /api/admin/users          - 列表
 * PATCH  /api/admin/users?id=xx    - 禁用/启用
 * DELETE /api/admin/users?id=xx    - 删除用户
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db-pg'
import { verifyAdminToken } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    verifyAdminToken(request)
    const sp = new URL(request.url).searchParams
    const page   = parseInt(sp.get('page')  || '1')
    const limit  = parseInt(sp.get('limit') || '20')
    const search = sp.get('search') || ''
    const offset = (page - 1) * limit

    const where = search ? `WHERE u.email ILIKE $3 OR u.display_name ILIKE $3` : ''
    const params: any[] = [limit, offset]
    if (search) params.push(`%${search}%`)

    const [countRes, dataRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users u ${where}`, search ? [`%${search}%`] : []),
      pool.query(`
        SELECT u.id, u.email, u.display_name, u.avatar_url, u.created_at,
               p.name as plan_name, p.slug as plan_slug,
               s.expires_at,
               (SELECT COUNT(*) FROM favorites WHERE user_id = u.id) as fav_count,
               (SELECT COUNT(*) FROM api_keys WHERE user_id = u.id) as key_count,
               (SELECT COUNT(*) FROM browse_history WHERE user_id = u.id) as history_count
        FROM users u
        LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
        LEFT JOIN plans p ON p.id = s.plan_id
        ${where}
        ORDER BY u.created_at DESC
        LIMIT $1 OFFSET $2
      `, params),
    ])

    return NextResponse.json({
      success: true,
      data: dataRes.rows.map(r => ({
        id: r.id, email: r.email, displayName: r.display_name,
        avatarUrl: r.avatar_url, createdAt: r.created_at,
        planName: r.plan_name || '免费版', planSlug: r.plan_slug || 'free',
        expiresAt: r.expires_at,
        favCount: parseInt(r.fav_count), keyCount: parseInt(r.key_count),
        historyCount: parseInt(r.history_count),
      })),
      total: parseInt(countRes.rows[0].count), page, limit,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    verifyAdminToken(request)
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 })
    const { action, planSlug, expiresAt } = await request.json()

    if (action === 'set_plan' && planSlug) {
      const planRes = await pool.query('SELECT id FROM plans WHERE slug = $1', [planSlug])
      if (planRes.rows.length === 0) return NextResponse.json({ success: false, error: '套餐不存在' }, { status: 400 })
      await pool.query(`
        INSERT INTO subscriptions (user_id, plan_id, status, expires_at, created_at, updated_at)
        VALUES ($1, $2, 'active', $3, NOW(), NOW())
        ON CONFLICT (user_id) WHERE status='active'
        DO UPDATE SET plan_id=$2, expires_at=$3, updated_at=NOW()
      `, [id, planRes.rows[0].id, expiresAt || null])
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    verifyAdminToken(request)
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 })
    // 级联删除（favorites/history/api_keys/subscriptions 都有 ON DELETE CASCADE）
    await pool.query('DELETE FROM users WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}
