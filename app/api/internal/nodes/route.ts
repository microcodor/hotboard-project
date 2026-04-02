/**
 * 内部接口：获取节点列表
 * 仅限服务端调用，需要 INTERNAL_TOKEN 鉴权
 * 用于首页 SSR，不走 API Key 扣费逻辑
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db-pg'

const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'hotboard-internal-2026'

export async function GET(request: NextRequest) {
  // 验证内部 Token
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') || request.nextUrl.searchParams.get('token')

  if (token !== INTERNAL_TOKEN) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('cid')
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    // 总数
    let countQuery = `SELECT COUNT(*) as total FROM nodes n`
    const countParams: any[] = []
    if (category) { countQuery += ` WHERE n.category_name = $1`; countParams.push(category) }
    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].total)

    // 节点列表
    const params: any[] = []
    let nodesQuery = `
      SELECT n.id, n.hashid, n.name, n.url, n.logo,
             n.category_id, n.category_name, n.display_name,
             n.created_at, n.updated_at, n.display_order,
             (SELECT COUNT(*) FROM items WHERE node_hashid = n.hashid) as items_count,
             (SELECT MAX(created_at) FROM items WHERE node_hashid = n.hashid) as latest_item_time
      FROM nodes n`
    if (category) { nodesQuery += ` WHERE n.category_name = $1`; params.push(category) }
    nodesQuery += ` ORDER BY n.display_order ASC NULLS LAST, n.category_name, n.name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const nodesResult = await pool.query(nodesQuery, params)

    const nodes = await Promise.all(
      nodesResult.rows.map(async (node) => {
        const itemsResult = await pool.query(
          `SELECT id, title, url, hot_value, rank, thumbnail, description, created_at
           FROM items WHERE node_hashid = $1 ORDER BY rank LIMIT 50`,
          [node.hashid]
        )
        const platform = {
          id: node.hashid, name: node.name,
          displayName: node.display_name || node.name,
          category: node.category_name, url: node.url, logo: node.logo || null,
        }
        return {
          id: node.id.toString(), hashid: node.hashid,
          name: node.name, displayName: node.display_name || node.name,
          url: node.url, logo: node.logo,
          categoryId: node.category_id, categoryName: node.category_name,
          platform,
          items: itemsResult.rows.map((item) => ({
            id: item.id.toString(), title: item.title, url: item.url,
            hotValue: item.hot_value, hotText: item.hot_value ? formatHot(item.hot_value) : '',
            rank: item.rank, thumbnail: item.thumbnail, description: item.description,
            created_at: item.created_at, platform,
          })),
          itemsCount: parseInt(node.items_count) || 0,
          updatedAt: node.latest_item_time ? new Date(node.latest_item_time).toISOString() : (node.updated_at ? new Date(node.updated_at).toISOString() : new Date().toISOString()),
          createdAt: node.created_at?.toISOString() || new Date().toISOString(),
        }
      })
    )

    return NextResponse.json({
      success: true, data: nodes, total, offset, limit,
      hasMore: offset + nodes.length < total,
    })
  } catch (error: any) {
    console.error('[API] /api/internal/nodes error:', error)
    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 })
  }
}

function formatHot(v: number): string {
  if (v >= 1e8) return `${(v / 1e8).toFixed(1)}亿`
  if (v >= 1e4) return `${(v / 1e4).toFixed(0)}万`
  return v.toLocaleString()
}
