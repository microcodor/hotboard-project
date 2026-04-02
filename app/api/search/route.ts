/**
 * 搜索 API
 * GET /api/search?q=关键词&platform=&page=1&limit=20
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db-pg'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const q        = (sp.get('q') || '').trim()
    const platform = sp.get('platform') || ''
    const page     = Math.max(1, parseInt(sp.get('page') || '1'))
    const limit    = Math.min(50, parseInt(sp.get('limit') || '20'))
    const offset   = (page - 1) * limit

    if (!q) return NextResponse.json({ success: true, data: [], total: 0 })

    const conditions = [`i.title ILIKE $1`]
    const params: any[] = [`%${q}%`]
    let idx = 2

    if (platform) { conditions.push(`i.node_hashid = $${idx++}`); params.push(platform) }

    const where = `WHERE ${conditions.join(' AND ')}`

    const [rows, countRow] = await Promise.all([
      pool.query(
        `SELECT i.id, i.node_hashid, i.title, i.url, i.hot_value, i.rank, i.thumbnail, i.created_at,
                n.name as platform_name, n.display_name as platform_display, n.logo as platform_logo
         FROM items i
         LEFT JOIN nodes n ON n.hashid = i.node_hashid
         ${where}
         ORDER BY i.hot_value DESC NULLS LAST, i.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM items i ${where}`, params),
    ])

    return NextResponse.json({
      success: true,
      data: rows.rows,
      total: parseInt(countRow.rows[0].count),
      page,
      limit,
      query: q,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
