/**
 * API Key 鉴权工具
 * 支持两种方式：
 *   1. Header: Authorization: Bearer <api_key>
 *   2. Query:  ?api_key=<api_key>
 */
import { NextRequest } from 'next/server';
import pool from '@/lib/db-pg';
import crypto from 'crypto';

export function generateApiKey(): string {
  // 格式: hb_<32位随机hex>  共 35 字符
  return 'hb_' + crypto.randomBytes(16).toString('hex');
}

export interface ApiKeyPayload {
  userId: number;
  keyId: number;
  keyName: string;
}

/**
 * 从请求中提取并验证 API Key
 * 返回 payload 或 null（未提供 key 时）
 * 抛出 Error（key 无效/禁用时）
 */
export async function verifyApiKey(request: NextRequest): Promise<ApiKeyPayload | null> {
  // 1. 从 Authorization header 提取
  const authHeader = request.headers.get('authorization') || '';
  let key = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  // 2. 从 query 参数提取
  if (!key) {
    key = new URL(request.url).searchParams.get('api_key') || '';
  }

  if (!key) return null; // 未提供 key，由调用方决定是否允许匿名访问

  // 3. 查库验证
  const result = await pool.query(
    `SELECT ak.id, ak.user_id, ak.name, ak.is_active
     FROM api_keys ak
     WHERE ak.key = $1`,
    [key]
  );

  if (result.rows.length === 0) {
    throw new Error('API Key 无效');
  }

  const row = result.rows[0];
  if (!row.is_active) {
    throw new Error('API Key 已被禁用');
  }

  // 4. 异步更新 last_used_at（不阻塞响应）
  pool.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [row.id]).catch(() => {});

  return { userId: row.user_id, keyId: row.id, keyName: row.name };
}
