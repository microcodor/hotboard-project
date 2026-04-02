/**
 * 管理后台 - 平台排序 API
 * PATCH /api/admin/platforms/reorder
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db-pg'
import { verifyAdminToken } from '@/lib/admin-auth'

export async function PATCH(request: NextRequest) {
  try {
    verifyAdminToken(request)
    const { orders } = await request.json()
    
    if (!Array.isArray(orders)) {
      return NextResponse.json({ success: false, error: 'orders 必须是数组' }, { status: 400 })
    }

    // 批量更新排序
    for (const { id, displayOrder } of orders) {
      await pool.query(
        'UPDATE nodes SET display_order = $1, updated_at = NOW() WHERE id = $2',
        [displayOrder, id]
      )
    }

    return NextResponse.json({ success: true, message: '排序已更新' })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}
