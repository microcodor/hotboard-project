/**
 * 注册 API
 * POST /api/auth/register
 * 注册成功后自动生成第一个 API Key
 */
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db-pg';
import { generateApiKey } from '@/lib/api-key';

const JWT_SECRET = process.env.JWT_SECRET || 'hotboard-secret-2026';

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: '邮箱和密码不能为空' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: '密码至少6位' }, { status: 400 });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ success: false, error: '该邮箱已被注册' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, email, display_name, created_at`,
      [email, passwordHash, username || email.split('@')[0]]
    );

    const user = result.rows[0];

    // 自动生成第一个 API Key
    const apiKey = generateApiKey();
    await pool.query(
      `INSERT INTO api_keys (user_id, key, name, created_at, updated_at)
       VALUES ($1, $2, 'Default Key', NOW(), NOW())`,
      [user.id, apiKey]
    );

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
      },
      apiKey, // 注册时明文返回一次，之后只能在控制台查看
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
    console.error('[API] /api/auth/register error:', error);
    return NextResponse.json({ success: false, error: '注册失败，请重试' }, { status: 500 });
  }
}
