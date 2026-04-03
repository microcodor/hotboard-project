/**
 * 榜单节点 API
 * GET /api/nodes
 * 外部 API 接口，需要 API Key 鉴权
 * 按抓取时间倒序返回所有新闻
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db-pg'
import { verifyApiKey } from '@/lib/api-key'
import { checkAndDeduct, deductCredits, ensureCredits, getClientIp } from '@/lib/quota'

export async function GET(request: NextRequest) {
  try {
    // 强制要求 API Key
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

    // 限流检查
    const ip = getClientIp(request)
    const rl = await checkAndDeduct(userId, ip)
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: `今日免费次数已用完（${rl.limit}次/天），请注册账号或充值`, rateLimit: rl },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit':     String(rl.limit),
            'X-RateLimit-Remaining': String(rl.remaining),
            'X-RateLimit-Reset':     rl.resetAt,
            'Retry-After':           '86400',
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
          'displayName', COALESCE(n.display_name, n.name),
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
      hasMore: offset + result.rows.length < parseInt(countResult.rows[0].count),
      rateLimit: { limit: rl.limit, used: rl.used, remaining: currentBalance, balance: currentBalance, resetAt: rl.resetAt },
      _auth: { userId, keyName: apiKeyName },
    })
  } catch (error: any) {
    console.error('[API] /api/nodes error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
