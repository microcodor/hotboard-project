/**
 * 获取当前用户信息 API
 * GET /api/auth/me - 获取用户信息
 * PATCH /api/auth/me - 更新用户信息
 * DELETE /api/auth/me - 登出
 */
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db-pg';

const JWT_SECRET = process.env.JWT_SECRET || 'hotboard-secret-2026';

function verifyToken(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) throw new Error('未登录');
  return jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
}

export async function GET(request: NextRequest) {
  try {
    const payload = verifyToken(request);

    const result = await pool.query(
      'SELECT id, email, display_name, avatar_url, bio, created_at FROM users WHERE id = $1',
      [payload.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    const user = result.rows[0];
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        createdAt: user.created_at,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: '未登录或登录已过期' }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const payload = verifyToken(request);
    const updates = await request.json();

    const allowedFields = ['display_name', 'avatar_url', 'bio'];
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (field in updates) {
        updateFields.push(`${field} = $${paramIndex}`);
        updateValues.push(updates[field]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ success: false, error: '没有要更新的字段' }, { status: 400 });
    }

    updateValues.push(payload.userId);
    const query = `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING id, email, display_name, avatar_url, bio`;

    const result = await pool.query(query, updateValues);
    const user = result.rows[0];

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
      },
    });
  } catch (error: any) {
    console.error('[API] PATCH /api/auth/me error:', error);
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('auth_token');
  return response;
}
