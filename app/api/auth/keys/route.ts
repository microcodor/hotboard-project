/**
 * API Key 管理接口
 * GET    /api/auth/keys        - 列出当前用户所有 API Key
 * POST   /api/auth/keys        - 新建 API Key
 * DELETE /api/auth/keys?id=xx  - 删除指定 API Key
 */
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db-pg';
import { generateApiKey } from '@/lib/api-key';

const JWT_SECRET = process.env.JWT_SECRET || 'hotboard-secret-2026';

function getUserId(request: NextRequest): number {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) throw new Error('未登录');
  const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
  return payload.userId;
}

// 列出所有 Key（key 值脱敏，只显示前8位）
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const result = await pool.query(
      `SELECT id, name, key, is_active, last_used_at, created_at
       FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return NextResponse.json({
      success: true,
      keys: result.rows.map(k => ({
        id: k.id,
        name: k.name,
        keyPreview: k.key.substring(0, 8) + '...',  // 脱敏
        isActive: k.is_active,
        lastUsedAt: k.last_used_at,
        createdAt: k.created_at,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 });
  }
}

// 新建 Key
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const body = await request.json().catch(() => ({}));
    const name = body.name || `Key ${new Date().toLocaleDateString('zh-CN')}`;

    // 限制每用户最多 10 个 Key
    const count = await pool.query('SELECT COUNT(*) FROM api_keys WHERE user_id = $1', [userId]);
    if (parseInt(count.rows[0].count) >= 10) {
      return NextResponse.json({ success: false, error: '最多创建 10 个 API Key' }, { status: 400 });
    }

    const key = generateApiKey();
    const result = await pool.query(
      `INSERT INTO api_keys (user_id, key, name, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id, name, created_at`,
      [userId, key, name]
    );

    return NextResponse.json({
      success: true,
      key,           // 新建时明文返回一次
      id: result.rows[0].id,
      name: result.rows[0].name,
      createdAt: result.rows[0].created_at,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 });
  }
}

// 删除 Key
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: '缺少 id 参数' }, { status: 400 });

    const result = await pool.query(
      'DELETE FROM api_keys WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Key 不存在或无权限' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 });
  }
}
