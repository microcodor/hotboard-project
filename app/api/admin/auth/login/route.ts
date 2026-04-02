/**
 * 管理员登录 API
 * POST /api/admin/auth/login
 */
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db-pg'
import { signAdminToken } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password)
      return NextResponse.json({ success: false, error: '参数不完整' }, { status: 400 })

    const result = await pool.query(
      'SELECT id, email, password_hash, role, is_active FROM admins WHERE email = $1',
      [email]
    )
    if (result.rows.length === 0)
      return NextResponse.json({ success: false, error: '账号或密码错误' }, { status: 401 })

    const admin = result.rows[0]
    if (!admin.is_active)
      return NextResponse.json({ success: false, error: '账号已被禁用' }, { status: 403 })

    const valid = await bcrypt.compare(password, admin.password_hash)
    if (!valid)
      return NextResponse.json({ success: false, error: '账号或密码错误' }, { status: 401 })

    await pool.query('UPDATE admins SET last_login_at = NOW() WHERE id = $1', [admin.id])

    const token = signAdminToken({ adminId: admin.id, email: admin.email, role: admin.role })
    const response = NextResponse.json({ success: true, admin: { id: admin.id, email: admin.email, role: admin.role } })
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    })
    return response
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('admin_token')
  return response
}
