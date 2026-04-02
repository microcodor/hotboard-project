/**
 * 管理后台 - 内容管理 API
 * GET    /api/admin/items  - 列表（分页+搜索+平台筛选）
 * DELETE /api/admin/items  - 删除（单条 ?id=x 或批量 ?ids=1,2,3 或清空 ?platform=xxx）
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'
import pool from '@/lib/db-pg'

export async function GET(request: NextRequest) {
  try {
    verifyAdminToken(request)
    const sp = request.nextUrl.searchParams
    const page     = Math.max(1, parseInt(sp.get('page') || '1'))
    const limit    = Math.min(50, parseInt(sp.get('limit') || '20'))
    const offset   = (page - 1) * limit
    const platform = sp.get('platform') || ''
    const search   = sp.get('search') || ''

    const conditions: string[] = []
    const params: any[] = []
    let idx = 1

    if (platform) { conditions.push(`i.node_hashid = $${idx++}`); params.push(platform) }
    if (search)   {
      conditions.push(`(i.title ILIKE $${idx} OR i.url ILIKE $${idx + 1})`)
      params.push(`%${search}%`, `%${search}%`)
      idx += 2
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows, countRow] = await Promise.all([
      pool.query(
        `SELECT i.id, i.node_hashid, i.title, i.url, i.hot_value, i.rank as rank_num, i.thumbnail, i.created_at,
                n.name as platform_name
         FROM items i
         LEFT JOIN nodes n ON n.hashid = i.node_hashid
         ${where}
         ORDER BY i.created_at DESC, i.rank ASC
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
    })
  } catch (e: any) {
    const status = e.message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ success: false, error: e.message }, { status })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    verifyAdminToken(request)
    const sp = request.nextUrl.searchParams
    const id       = sp.get('id')
    const ids      = sp.get('ids')
    const platform = sp.get('platform')

    if (id) {
      await pool.query('DELETE FROM items WHERE id = $1', [parseInt(id)])
      return NextResponse.json({ success: true, message: '已删除' })
    }
    if (ids) {
      const idList = ids.split(',').map(Number).filter(Boolean)
      await pool.query('DELETE FROM items WHERE id = ANY($1)', [idList])
      return NextResponse.json({ success: true, message: `已删除 ${idList.length} 条` })
    }
    if (platform) {
      const r = await pool.query('DELETE FROM items WHERE node_hashid = $1', [platform])
      return NextResponse.json({ success: true, message: `已清空 ${r.rowCount} 条` })
    }
    return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 })
  } catch (e: any) {
    const status = e.message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ success: false, error: e.message }, { status })
  }
}
