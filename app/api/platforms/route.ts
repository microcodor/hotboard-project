/**
 * 平台列表 API
 * GET /api/platforms
 * 对外公开接口，无需鉴权
 */
import { NextResponse } from 'next/server'
import pool from '@/lib/db-pg'

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        n.hashid as id,
        n.name,
        n.display_name as "displayName",
        n.category_name as category,
        n.url,
        n.logo,
        (SELECT COUNT(*) FROM items WHERE node_hashid = n.hashid) as "itemsCount",
        (SELECT MAX(created_at) FROM items WHERE node_hashid = n.hashid) as "updatedAt"
      FROM nodes n
      ORDER BY n.display_order ASC NULLS LAST, n.category_name, n.name
    `)

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    })
  } catch (error: any) {
    console.error('[API] /api/platforms error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}