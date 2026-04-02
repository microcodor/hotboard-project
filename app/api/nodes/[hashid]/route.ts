/**
 * 榜单详情 API
 * GET /api/nodes/[hashid]
 *
 * 鉴权：同 /api/nodes，API Key 可选
 * 每条 item 均包含 platform 字段
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-pg';
import { verifyApiKey } from '@/lib/api-key';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hashid: string }> }
) {
  try {
    // 鉴权（可选）
    let apiUser = null;
    try {
      apiUser = await verifyApiKey(request);
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 401 });
    }

    const { hashid } = await params;

    const nodeResult = await pool.query(
      `SELECT id, hashid, name, url, logo, category_id, category_name, display_name, created_at, updated_at
       FROM nodes WHERE hashid = $1`,
      [hashid]
    );

    if (nodeResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: '榜单不存在', data: null }, { status: 404 });
    }

    const node = nodeResult.rows[0];

    const itemsResult = await pool.query(
      `SELECT id, title, url, hot_value, rank, thumbnail, description, created_at
       FROM items WHERE node_hashid = $1 ORDER BY rank ASC LIMIT 100`,
      [hashid]
    );

    // platform 元信息
    const platform = {
      id: node.hashid,
      name: node.name,
      displayName: node.display_name || node.name,
      category: node.category_name,
      url: node.url,
      logo: node.logo || null,
    };

    const responseData = {
      id: node.id.toString(),
      hashid: node.hashid,
      name: node.name,
      displayName: node.display_name || node.name,
      url: node.url,
      logo: node.logo,
      categoryId: node.category_id,
      categoryName: node.category_name,
      platform,                              // ← 平台信息
      items: itemsResult.rows.map((item) => ({
        id: item.id.toString(),
        title: item.title,
        url: item.url,
        hotValue: item.hot_value || 0,
        hotText: item.hot_value ? formatHot(item.hot_value) : '',
        rank: item.rank,
        thumbnail: item.thumbnail,
        description: item.description,
        platform,                            // ← 每条热点也带平台信息
      })),
      itemsCount: itemsResult.rows.length,
      updatedAt: node.updated_at?.toISOString() || new Date().toISOString(),
      createdAt: node.created_at?.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      ...(apiUser ? { _auth: { userId: apiUser.userId, keyName: apiUser.keyName } } : {}),
    });
  } catch (error: any) {
    console.error('[API] /api/nodes/[hashid] error:', error);
    return NextResponse.json({ success: false, error: error.message, data: null }, { status: 500 });
  }
}

function formatHot(v: number): string {
  if (v >= 1e8) return `${(v / 1e8).toFixed(1)}亿`;
  if (v >= 1e4) return `${(v / 1e4).toFixed(0)}万`;
  return v.toLocaleString();
}
