/**
 * 收藏 API
 * GET    /api/favorites         - 获取收藏列表
 * POST   /api/favorites         - 添加收藏
 */
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pool from '@/lib/db-pg'

const JWT_SECRET = process.env.JWT_SECRET || 'hotboard-secret-2026'

function getUserId(request: NextRequest): number {
  const token = request.cookies.get('auth_token')?.value
  if (!token) throw new Error('未登录')
  const payload = jwt.verify(token, JWT_SECRET) as { userId: number }
  return payload.userId
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request)
    const result = await pool.query(
      `SELECT f.id, f.node_hashid, f.created_at as favorited_at,
              n.name, n.display_name, n.category_name, n.url, n.logo,
              (SELECT COUNT(*) FROM items WHERE node_hashid = n.hashid) as items_count
       FROM favorites f
       JOIN nodes n ON n.hashid = f.node_hashid
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    )
    return NextResponse.json({
      success: true,
      data: result.rows.map(r => ({
        hashid: r.node_hashid,
        name: r.name,
        displayName: r.display_name || r.name,
        categoryName: r.category_name,
        url: r.url,
        logo: r.logo,
        itemsCount: parseInt(r.items_count),
        favoritedAt: r.favorited_at,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request)
    const { hashid } = await request.json()
    if (!hashid) return NextResponse.json({ success: false, error: '缺少 hashid' }, { status: 400 })

    // 检查节点是否存在
    const node = await pool.query('SELECT hashid FROM nodes WHERE hashid = $1', [hashid])
    if (node.rows.length === 0) return NextResponse.json({ success: false, error: '榜单不存在' }, { status: 404 })

    await pool.query(
      'INSERT INTO favorites (user_id, node_hashid, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
      [userId, hashid]
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}
