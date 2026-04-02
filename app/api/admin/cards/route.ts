/**
 * 管理员卡密管理 API
 * GET    /api/admin/cards          - 列表（支持筛选）
 * POST   /api/admin/cards          - 批量生成
 * PATCH  /api/admin/cards?id=xx    - 禁用/启用单张
 * DELETE /api/admin/cards?id=xx    - 删除未使用的卡密
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db-pg'
import { verifyAdminToken } from '@/lib/admin-auth'
import { generateBatch, prefixForPlan } from '@/lib/card-key'

export async function GET(request: NextRequest) {
  try {
    verifyAdminToken(request)
    const sp = new URL(request.url).searchParams
    const status = sp.get('status') || ''       // unused/used/disabled
    const type   = sp.get('type')   || ''
    const batch  = sp.get('batch')  || ''
    const page   = parseInt(sp.get('page') || '1')
    const limit  = parseInt(sp.get('limit') || '20')
    const offset = (page - 1) * limit

    const conditions: string[] = []
    const params: any[] = []
    let i = 1
    if (status) { conditions.push(`ck.status = $${i++}`); params.push(status) }
    if (type)   { conditions.push(`ck.type = $${i++}`);   params.push(type) }
    if (batch)  { conditions.push(`ck.batch_id = $${i++}`); params.push(batch) }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

    const [countRes, dataRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM card_keys ck ${where}`, params),
      pool.query(
        `SELECT ck.id, ck.code, ck.type, ck.status, ck.batch_id, ck.note,
                ck.credits_amount, ck.duration_days, ck.used_at, ck.created_at,
                p.name as plan_name, p.slug as plan_slug,
                u.email as used_by_email
         FROM card_keys ck
         LEFT JOIN plans p ON p.id = ck.plan_id
         LEFT JOIN users u ON u.id = ck.used_by
         ${where}
         ORDER BY ck.created_at DESC
         LIMIT $${i} OFFSET $${i + 1}`,
        [...params, limit, offset]
      ),
    ])

    return NextResponse.json({
      success: true,
      data: dataRes.rows,
      total: parseInt(countRes.rows[0].count),
      page, limit,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = verifyAdminToken(request)
    const body = await request.json()
    const {
      type,           // plan_monthly / plan_yearly / credits
      planSlug,       // basic/pro/enterprise（type=plan_* 时）
      creditsAmount,  // type=credits 时
      count = 1,      // 生成数量，最多500
      note = '',
      batchId,        // 自定义批次号，不填则自动生成
    } = body

    if (!type) return NextResponse.json({ success: false, error: '缺少 type' }, { status: 400 })
    if (count < 1 || count > 500)
      return NextResponse.json({ success: false, error: '数量范围 1-500' }, { status: 400 })

    // 查套餐
    let planId: number | null = null
    let durationDays: number | null = null
    if (type === 'plan_monthly' || type === 'plan_yearly') {
      if (!planSlug) return NextResponse.json({ success: false, error: '缺少 planSlug' }, { status: 400 })
      const planRes = await pool.query('SELECT id FROM plans WHERE slug = $1', [planSlug])
      if (planRes.rows.length === 0)
        return NextResponse.json({ success: false, error: '套餐不存在' }, { status: 400 })
      planId = planRes.rows[0].id
      durationDays = type === 'plan_monthly' ? 30 : 365
    }
    if (type === 'credits' && (!creditsAmount || creditsAmount < 1))
      return NextResponse.json({ success: false, error: '点数数量无效' }, { status: 400 })

    const prefix = type === 'credits' ? 'HBC' : prefixForPlan(planSlug || '')
    const codes = generateBatch(count, prefix)
    const batch = batchId || `BATCH-${Date.now()}`

    // 批量插入
    const values = codes.map((code, idx) =>
      `('${code}', '${type}', ${planId ?? 'NULL'}, ${creditsAmount ?? 'NULL'}, ${durationDays ?? 'NULL'}, '${batch}', '${note.replace(/'/g, "''")}', ${admin.adminId}, NOW())`
    ).join(',\n')

    await pool.query(
      `INSERT INTO card_keys (code, type, plan_id, credits_amount, duration_days, batch_id, note, created_by, created_at)
       VALUES ${values}`
    )

    return NextResponse.json({ success: true, count: codes.length, batchId: batch, codes })
  } catch (e: any) {
    console.error('[Admin] POST /api/admin/cards error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    verifyAdminToken(request)
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 })
    const { status } = await request.json()
    if (!['disabled', 'unused'].includes(status))
      return NextResponse.json({ success: false, error: '无效状态' }, { status: 400 })

    const result = await pool.query(
      "UPDATE card_keys SET status = $1 WHERE id = $2 AND status != 'used' RETURNING id",
      [status, id]
    )
    if (result.rows.length === 0)
      return NextResponse.json({ success: false, error: '卡密不存在或已被使用' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    verifyAdminToken(request)
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 })
    const result = await pool.query(
      "DELETE FROM card_keys WHERE id = $1 AND status = 'unused' RETURNING id",
      [id]
    )
    if (result.rows.length === 0)
      return NextResponse.json({ success: false, error: '只能删除未使用的卡密' }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}
