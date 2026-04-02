/**
 * 榜单内容项 API
 * GET /api/nodes/[hashid]/items - 获取榜单内容列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { nodesDb } from '@/lib/db';
import { withCache, cacheKeys } from '@/lib/cache';
import { CACHE_TTL } from '@/lib/constants';
import type { ApiResponse, NodeItemsData, GetNodeItemsParams } from '@/types/api';

interface RouteParams {
  params: {
    hashid: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<NodeItemsData>>> {
  const { hashid } = params;

  if (!hashid) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'hashid is required',
        },
      },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const queryParams: GetNodeItemsParams = {
    hashid,
    page,
    pageSize,
  };

  try {
    // 使用缓存
    const result = await withCache(
      cacheKeys.nodeItems(hashid, page),
      async () => {
        // 获取榜单信息
        const nodeResult = await nodesDb.getByHashid(hashid);

        if (nodeResult.error) {
          return { nodeResult, itemsResult: null };
        }

        // 获取内容项
        const itemsResult = await nodesDb.getItems(queryParams);

        return { nodeResult, itemsResult };
      },
      { ttl: CACHE_TTL.NODE_ITEMS }
    );

    const { nodeResult, itemsResult } = result;

    if (nodeResult?.error) {
      const statusCode = nodeResult.error.code === 'NOT_FOUND' ? 404 : 500;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: nodeResult.error.code || 'DB_ERROR',
            message: nodeResult.error.message,
          },
        },
        { status: statusCode }
      );
    }

    if (!itemsResult) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch items',
          },
        },
        { status: 500 }
      );
    }

    if (itemsResult.error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DB_ERROR',
            message: itemsResult.error.message,
          },
        },
        { status: 500 }
      );
    }

    const response: ApiResponse<NodeItemsData> = {
      success: true,
      data: {
        items: itemsResult.data || [],
        node: nodeResult?.data
          ? {
              hashid: nodeResult.data.hashid,
              name: nodeResult.data.name,
              logo: nodeResult.data.logo,
            }
          : { hashid, name: '', logo: '' },
        meta: {
          page,
          pageSize,
          total: itemsResult.count || 0,
          hasMore: (itemsResult.count || 0) > page * pageSize,
        },
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
