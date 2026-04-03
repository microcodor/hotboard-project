/**
 * 内部接口：获取分类列表
 * 仅限服务端调用，需要 INTERNAL_TOKEN 鉴权
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db-pg'

const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || process.env.NEXT_PUBLIC_INTERNAL_TOKEN || 'hotboard-internal-2026'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') || request.nextUrl.searchParams.get('token')

  if (token !== INTERNAL_TOKEN) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await pool.query(`
      SELECT DISTINCT category_name as name, category_id as id
      FROM nodes
      WHERE category_name IS NOT NULL
      ORDER BY category_name
    `)

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
