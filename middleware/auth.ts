/**
 * 认证中间件
 * 用于验证 API 请求的用户身份
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../lib/supabase';

/**
 * 认证结果
 */
export interface AuthResult {
  authorized: boolean;
  userId?: string;
  error?: string;
}

/**
 * 从请求中获取认证信息
 */
export async function getAuthFromRequest(
  request: NextRequest
): Promise<AuthResult> {
  try {
    // 从 Authorization header 获取 token
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authorized: false, error: 'No authorization header' };
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return { authorized: false, error: 'No token provided' };
    }

    // 验证 token
    const supabase = getSupabaseAdmin();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { authorized: false, error: 'Invalid token' };
    }

    return { authorized: true, userId: user.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { authorized: false, error: errorMessage };
  }
}

/**
 * 认证中间件函数
 * 验证请求是否包含有效的认证信息
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, userId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  const authResult = await getAuthFromRequest(request);

  if (!authResult.authorized) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: authResult.error || 'Authentication required',
        },
      },
      { status: 401 }
    );
  }

  return handler(request, authResult.userId!);
}

/**
 * 可选认证中间件
 * 如果有 token 则验证，没有则继续（userId 为 undefined）
 */
export async function withOptionalAuth(
  request: NextRequest,
  handler: (request: NextRequest, userId?: string) => Promise<NextResponse>
): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return handler(request);
  }

  const authResult = await getAuthFromRequest(request);
  return handler(request, authResult.userId);
}

/**
 * 验证 API Key（用于服务间调用）
 */
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const validApiKey = process.env.INTERNAL_API_KEY;

  if (!validApiKey) {
    console.warn('INTERNAL_API_KEY not configured');
    return false;
  }

  return apiKey === validApiKey;
}

/**
 * API Key 认证中间件
 * 用于内部服务调用
 */
export async function withApiKey(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Invalid API key',
        },
      },
      { status: 403 }
    );
  }

  return handler(request);
}
