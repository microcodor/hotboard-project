/**
 * 修改密码 API
 * POST /api/user/password
 */
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db-pg'

const JWT_SECRET = process.env.JWT_SECRET || 'hotboard-secret-2026'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    const { userId } = jwt.verify(token, JWT_SECRET) as { userId: number }

    const { oldPassword, newPassword } = await request.json()
    if (!oldPassword || !newPassword) {
      return NextResponse.json({ success: false, error: '参数不完整' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: '新密码至少6位' }, { status: 400 })
    }

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId])
    if (result.rows.length === 0) return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 })

    const valid = await bcrypt.compare(oldPassword, result.rows[0].password_hash)
    if (!valid) return NextResponse.json({ success: false, error: '当前密码错误' }, { status: 400 })

    const newHash = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId])

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
