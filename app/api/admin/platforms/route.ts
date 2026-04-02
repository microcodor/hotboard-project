/**
 * 管理后台 - 平台管理 API
 * GET    /api/admin/platforms          - 列表
 * POST   /api/admin/platforms          - 新增平台
 * PATCH  /api/admin/platforms?id=xx    - 编辑
 * DELETE /api/admin/platforms?id=xx    - 删除
 * PATCH  /api/admin/platforms/reorder  - 批量更新排序
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db-pg'
import { verifyAdminToken } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    verifyAdminToken(request)
    const result = await pool.query(`
      SELECT n.id, n.hashid, n.name, n.display_name, n.url, n.logo,
             n.category_name, n.display_order, n.created_at, n.updated_at,
             (SELECT COUNT(*) FROM items WHERE node_hashid = n.hashid) as items_count,
             (SELECT MAX(created_at) FROM items WHERE node_hashid = n.hashid) as last_crawled
      FROM nodes n
      ORDER BY n.display_order ASC, n.category_name, n.name
    `)

    return NextResponse.json({
      success: true,
      data: result.rows.map(r => ({
        id: r.id, hashid: r.hashid, name: r.name,
        displayName: r.display_name || r.name,
        url: r.url, logo: r.logo, categoryName: r.category_name,
        displayOrder: r.display_order || 0,
        itemsCount: parseInt(r.items_count),
        lastCrawled: r.last_crawled,
        updatedAt: r.updated_at,
        status: r.last_crawled
          ? (Date.now() - new Date(r.last_crawled).getTime() < 2 * 3600000 ? 'ok' : 'warn')
          : 'empty',
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    verifyAdminToken(request)
    const { hashid, name, displayName, url, logo, categoryName, displayOrder } = await request.json()
    if (!hashid || !name) return NextResponse.json({ success: false, error: '缺少必填字段' }, { status: 400 })

    // 获取当前最大排序值
    const maxOrder = await pool.query('SELECT MAX(display_order) as max FROM nodes')
    const nextOrder = displayOrder || ((maxOrder.rows[0].max || 0) + 1)

    const result = await pool.query(
      `INSERT INTO nodes (hashid, name, display_name, url, logo, category_name, display_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING id`,
      [hashid, name, displayName || name, url || '', logo || '', categoryName || '综合', nextOrder]
    )
    return NextResponse.json({ success: true, id: result.rows[0].id })
  } catch (e: any) {
    if (e.code === '23505') return NextResponse.json({ success: false, error: 'hashid 已存在' }, { status: 409 })
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    verifyAdminToken(request)
    const url = new URL(request.url)
    
    // 批量更新排序
    if (url.pathname.endsWith('/reorder')) {
      const { orders } = await request.json()
      if (!Array.isArray(orders)) {
        return NextResponse.json({ success: false, error: 'orders 必须是数组' }, { status: 400 })
      }
      
      for (const { id, displayOrder } of orders) {
        await pool.query('UPDATE nodes SET display_order = $1, updated_at = NOW() WHERE id = $2', [displayOrder, id])
      }
      
      return NextResponse.json({ success: true, message: '排序已更新' })
    }

    // 单条编辑
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 })
    const { name, displayName, url: platformUrl, logo, categoryName, displayOrder } = await request.json()

    await pool.query(
      `UPDATE nodes SET name=$1, display_name=$2, url=$3, logo=$4, category_name=$5, display_order=$6, updated_at=NOW() WHERE id=$7`,
      [name, displayName || name, platformUrl, logo, categoryName, displayOrder, id]
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    verifyAdminToken(request)
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 })
    const node = await pool.query('SELECT hashid FROM nodes WHERE id = $1', [id])
    if (node.rows.length === 0) return NextResponse.json({ success: false, error: '平台不存在' }, { status: 404 })
    await pool.query('DELETE FROM items WHERE node_hashid = $1', [node.rows[0].hashid])
    await pool.query('DELETE FROM nodes WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
