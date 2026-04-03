/**
 * 平台热点 API
 * GET /api/platforms/[hashid]
 * 对外公开接口，无需鉴权
 * 根据平台 hashid 获取该平台的热点列表
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db-pg'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hashid: string }> }
) {
  try {
    const { hashid } = await params

    // 验证平台是否存在
    const nodeResult = await pool.query(
      'SELECT hashid, name, display_name, category_name, url, logo FROM nodes WHERE hashid = $1',
      [hashid]
    )
    if (nodeResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: '平台不存在' }, { status: 404 })
    }
    const node = nodeResult.rows[0]

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = await pool.query(`
      SELECT 
        i.id,
        i.title,
        i.url,
        i.hot_value as "hotValue",
        i.hot_value::text as "hotText",
        i.rank,
        i.thumbnail,
        i.description,
        i.created_at as "createdAt"
      FROM items i
      WHERE i.node_hashid = $1
      ORDER BY i.rank ASC, i.created_at DESC
      LIMIT $2 OFFSET $3
    `, [hashid, limit, offset])

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM items WHERE node_hashid = $1',
      [hashid]
    )
    const total = parseInt(countResult.rows[0].count)

    return NextResponse.json({
      success: true,
      platform: {
        id: node.hashid,
        name: node.name,
        displayName: node.display_name || node.name,
        category: node.category_name,
        url: node.url,
        logo: node.logo
      },
      data: result.rows,
      total,
      limit,
      offset,
      hasMore: offset + result.rows.length < total
    })
  } catch (error: any) {
    console.error('[API] /api/platforms/[hashid] error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}