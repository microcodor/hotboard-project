/**
 * 用户资料 API 路由
 * GET - 获取用户资料
 * PUT - 更新用户资料
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { usersDb } from '@/lib/db';
import { cacheUtils } from '@/lib/cache';
import type { UserProfile } from '@/types';

/**
 * 用户资料响应
 */
interface ProfileResponse {
  success: boolean;
  data?: UserProfile;
  error?: string;
}

/**
 * 获取用户资料
 */
async function handleGet(
  request: NextRequest,
  userId: string
): Promise<NextResponse<ProfileResponse>> {
  try {
    // 尝试从缓存获取
    const cacheKey = `profile:${userId}`;
    const profile = await cacheUtils.getOrSet(
      cacheKey,
      async () => {
        const result = await usersDb.getProfile(userId);
        if (result.error) {
          throw new Error(result.error.message);
        }
        return result.data;
      },
      600 // 10 分钟缓存
    );

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    console.error('获取用户资料失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '获取用户资料失败',
      },
      { status: 500 }
    );
  }
}

/**
 * 更新用户资料
 */
async function handlePut(
  request: NextRequest,
  userId: string
): Promise<NextResponse<ProfileResponse>> {
  try {
    const body = await request.json();

    // 验证更新字段
    const allowedFields = ['display_name', 'avatar_url', 'bio'];
    const updates: Record<string, any> = {};

    for (const field of allowedFields) {
      if (field in body) {
        const value = body[field];
        
        // 基本验证
        if (field === 'display_name' && value !== null && typeof value !== 'string') {
          return NextResponse.json(
            {
              success: false,
              error: 'display_name 必须是字符串',
            },
            { status: 400 }
          );
        }

        if (field === 'display_name' && value && value.length > 50) {
          return NextResponse.json(
            {
              success: false,
              error: 'display_name 长度不能超过 50 个字符',
            },
            { status: 400 }
          );
        }

        if (field === 'avatar_url' && value !== null && typeof value !== 'string') {
          return NextResponse.json(
            {
              success: false,
              error: 'avatar_url 必须是字符串',
            },
            { status: 400 }
          );
        }

        if (field === 'bio' && value !== null && typeof value !== 'string') {
          return NextResponse.json(
            {
              success: false,
              error: 'bio 必须是字符串',
            },
            { status: 400 }
          );
        }

        if (field === 'bio' && value && value.length > 500) {
          return NextResponse.json(
            {
              success: false,
              error: 'bio 长度不能超过 500 个字符',
            },
            { status: 400 }
          );
        }

        updates[field] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '没有要更新的字段',
        },
        { status: 400 }
      );
    }

    // 更新资料
    const result = await usersDb.updateProfile(userId, updates);

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          error: result.error.message,
        },
        { status: 500 }
      );
    }

    // 清除缓存
    cacheUtils.deletePattern(`profile:${userId}`);

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error: any) {
    console.error('更新用户资料失败:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: '请求体格式错误',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || '更新用户资料失败',
      },
      { status: 500 }
    );
  }
}

/**
 * GET 获取用户资料
 */
export async function GET(request: NextRequest): Promise<NextResponse<ProfileResponse>> {
  return withAuth(request, handleGet);
}

/**
 * PUT 更新用户资料
 */
export async function PUT(request: NextRequest): Promise<NextResponse<ProfileResponse>> {
  return withAuth(request, handlePut);
}
