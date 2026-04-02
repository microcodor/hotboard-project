/**
 * 登录 API
 * POST /api/auth/login
 */
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db-pg';

const JWT_SECRET = process.env.JWT_SECRET || 'hotboard-secret-2026';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: '邮箱和密码不能为空' }, { status: 400 });
    }

    // 查找用户
    const result = await pool.query(
      'SELECT id, email, password_hash, display_name, avatar_url FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: '邮箱或密码错误' }, { status: 401 });
    }

    const user = result.rows[0];

    // 验证密码
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ success: false, error: '邮箱或密码错误' }, { status: 401 });
    }

    // 生成 JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
      },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[API] /api/auth/login error:', error);
    return NextResponse.json({ success: false, error: '登录失败，请重试' }, { status: 500 });
  }
}
