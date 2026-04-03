/**
 * 新闻列表 API
 * GET /api/news
 * 按抓取时间倒序返回所有新闻
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db-pg'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // 按 created_at 降序排列，直接返回新闻列表
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
        i.created_at as "createdAt",
        json_build_object(
          'id', n.hashid,
          'name', n.name,
          'displayName', n.display_name,
          'category', n.category_name,
          'url', n.url
        ) as platform
      FROM items i
      JOIN nodes n ON i.node_hashid = n.hashid
      ORDER BY i.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset])

    // 获取总数
    const countResult = await pool.query('SELECT COUNT(*) FROM items')

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
      hasMore: offset + result.rows.length < parseInt(countResult.rows[0].count)
    })
  } catch (error: any) {
    console.error('News API error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
