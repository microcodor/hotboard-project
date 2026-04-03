/**
 * 平台热点 API
 * GET /api/platforms?platform=xxx&limit=50&offset=0
 * 需要 API Key 鉴权，根据平台获取热点列表
 * 不传 platform 参数时等同于获取所有平台的最新热点（同 /api/news）
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db-pg'
import { verifyApiKey } from '@/lib/api-key'
import { checkAndDeduct, deductCredits, ensureCredits, getClientIp } from '@/lib/quota'

export async function GET(request: NextRequest) {
  try {
    // 鉴权
    let userId: number | null = null
    let apiKeyName = ''
    try {
      const keyUser = await verifyApiKey(request)
      if (keyUser) {
        userId = keyUser.userId
        apiKeyName = keyUser.keyName
      } else {
        return NextResponse.json(
          { success: false, error: 'API Key required. Get your key at /user/billing' },
          { status: 401 }
        )
      }
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 401 })
    }

    // 限流
    const ip = getClientIp(request)
    const rl = await checkAndDeduct(userId, ip)
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: `今日免费次数已用完（${rl.limit}次/天），请注册账号或充值`, rateLimit: rl },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rl.limit),
            'X-RateLimit-Remaining': String(rl.remaining),
            'X-RateLimit-Reset': rl.resetAt,
            'Retry-After': '86400',
          },
        }
      )
    }

    let currentBalance = rl.balance
    if (userId !== null) {
      await ensureCredits(userId)
      const ok = await deductCredits(userId, 1)
      if (!ok) {
        return NextResponse.json(
          { success: false, error: '余额不足，请充值', rateLimit: { ...rl, balance: 0, remaining: 0, limit: 0 } },
          { status: 402, headers: {} }
        )
      }
      currentBalance = Math.max(0, (rl.balance ?? 0) - 1)
    }

    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // 指定平台
    if (platform) {
      // 查平台信息
      const nodeResult = await pool.query(
        'SELECT hashid, name, display_name, category_name, url, logo FROM nodes WHERE hashid = $1',
        [platform]
      )
      if (nodeResult.rows.length === 0) {
        return NextResponse.json({ success: false, error: '平台不存在' }, { status: 404 })
      }
      const node = nodeResult.rows[0]

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
      `, [platform, limit, offset])

      const countResult = await pool.query(
        'SELECT COUNT(*) FROM items WHERE node_hashid = $1',
        [platform]
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
        hasMore: offset + result.rows.length < total,
        rateLimit: { limit: rl.limit, used: rl.used, remaining: currentBalance, balance: currentBalance, resetAt: rl.resetAt },
        _auth: { userId, keyName: apiKeyName },
      })
    }

    // 不指定平台，返回所有平台列表
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
      total: result.rows.length,
      rateLimit: { limit: rl.limit, used: rl.used, remaining: currentBalance, balance: currentBalance, resetAt: rl.resetAt },
      _auth: { userId, keyName: apiKeyName },
    })
  } catch (error: any) {
    console.error('[API] /api/platforms error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}