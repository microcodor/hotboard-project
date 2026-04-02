/**
 * 头像上传 API（Base64 存储到数据库）
 * POST /api/user/avatar
 */
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pool from '@/lib/db-pg'

const JWT_SECRET = process.env.JWT_SECRET || 'hotboard-secret-2026'
const MAX_SIZE = 2 * 1024 * 1024 // 2MB

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    const { userId } = jwt.verify(token, JWT_SECRET) as { userId: number }

    const formData = await request.formData()
    const file = formData.get('avatar') as File | null
    if (!file) return NextResponse.json({ success: false, error: '未上传文件' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ success: false, error: '图片不能超过 2MB' }, { status: 400 })

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ success: false, error: '仅支持 JPG/PNG/GIF/WebP' }, { status: 400 })
    }

    // 转为 base64 data URL 存储
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const avatarUrl = `data:${file.type};base64,${base64}`

    await pool.query('UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [avatarUrl, userId])

    return NextResponse.json({ success: true, avatarUrl })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
