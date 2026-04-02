/**
 * 收藏操作 API
 * DELETE /api/favorites/[hashid] - 取消收藏
 * GET    /api/favorites/[hashid] - 检查是否已收藏
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ hashid: string }> }) {
  try {
    const userId = getUserId(request)
    const { hashid } = await params
    const result = await pool.query(
      'SELECT id FROM favorites WHERE user_id = $1 AND node_hashid = $2',
      [userId, hashid]
    )
    return NextResponse.json({ success: true, isFavorited: result.rows.length > 0 })
  } catch (e: any) {
    return NextResponse.json({ success: false, isFavorited: false })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ hashid: string }> }) {
  try {
    const userId = getUserId(request)
    const { hashid } = await params
    await pool.query('DELETE FROM favorites WHERE user_id = $1 AND node_hashid = $2', [userId, hashid])
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}
