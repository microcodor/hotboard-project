/**
 * 浏览历史 API
 * GET    /api/history         - 获取历史列表
 * POST   /api/history         - 添加历史记录
 * DELETE /api/history         - 清空历史 / 删除单条(?id=xx)
 */
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pool from '@/lib/db-pg'

const JWT_SECRET = process.env.JWT_SECRET || 'hotboard-secret-2026'

function getUserId(request: NextRequest): number {
  const token = request.cookies.get('auth_token')?.value
  if (!token) throw new Error('未登录')
  return (jwt.verify(token, JWT_SECRET) as { userId: number }).userId
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request)
    const limit = parseInt(new URL(request.url).searchParams.get('limit') || '50')

    const result = await pool.query(
      `SELECT bh.id, bh.node_hashid, bh.created_at as viewed_at,
              n.name, n.display_name, n.category_name
       FROM browse_history bh
       JOIN nodes n ON n.hashid = bh.node_hashid
       WHERE bh.user_id = $1
       ORDER BY bh.created_at DESC
       LIMIT $2`,
      [userId, limit]
    )

    return NextResponse.json({
      success: true,
      data: result.rows.map(r => ({
        id: r.id,
        nodeHashid: r.node_hashid,
        nodeName: r.name,
        nodeDisplayName: r.display_name || r.name,
        categoryName: r.category_name,
        viewedAt: r.viewed_at,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request)
    const { nodeHashid } = await request.json()
    if (!nodeHashid) return NextResponse.json({ success: false, error: '缺少 nodeHashid' }, { status: 400 })

    // 先删除同一用户对同一节点的旧记录，保持唯一（最新一条）
    await pool.query(
      'DELETE FROM browse_history WHERE user_id = $1 AND node_hashid = $2',
      [userId, nodeHashid]
    )
    await pool.query(
      'INSERT INTO browse_history (user_id, node_hashid, created_at) VALUES ($1, $2, NOW())',
      [userId, nodeHashid]
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserId(request)
    const id = new URL(request.url).searchParams.get('id')

    if (id) {
      // 删除单条
      await pool.query('DELETE FROM browse_history WHERE id = $1 AND user_id = $2', [id, userId])
    } else {
      // 清空全部
      await pool.query('DELETE FROM browse_history WHERE user_id = $1', [userId])
    }
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}
