/**
 * 榜单节点 API
 * GET /api/nodes
 * 支持 API Key 鉴权 + Cookie 认证，按充值余额扣次
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db-pg'
import { verifyApiKey } from '@/lib/api-key'
import { checkAndDeduct, deductCredits, ensureCredits, getClientIp } from '@/lib/quota'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'hotboard-secret-2026'

// 从 Cookie 获取登录用户
function getUserFromCookie(request: NextRequest): number | null {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) return null
    const { userId } = jwt.verify(token, JWT_SECRET) as { userId: number }
    return userId
  } catch { return null }
}

export async function GET(request: NextRequest) {
  try {
    // 1. 身份认证
    //    - API Key：优先，按充值余额扣费
    //    - Cookie：网页端浏览，不扣费（仅匿名用户受 IP 限流）
    let userId: number | null = null
    let isApiKeyMode = false
    let apiKeyName = ''
    try {
      const keyUser = await verifyApiKey(request)
      if (keyUser) { userId = keyUser.userId; isApiKeyMode = true; apiKeyName = keyUser.keyName }
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 401 })
    }
    // 无 API Key 时，尝试 Cookie（仅识别身份，不扣费）
    if (!isApiKeyMode) {
      userId = getUserFromCookie(request)
    }

    // 2. 限流检查
    //    - 匿名（无 Key 无 Cookie）：IP 级别每日 100 次免费
    //    - API Key 用户：余额扣费（余额不足 402）
    //    - Cookie 登录用户：免费，不受限流
    const ip = getClientIp(request)
    const rl = await checkAndDeduct(isApiKeyMode ? userId : null, ip)
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

    // 3. 仅 API Key 模式扣余额，Cookie/匿名用户不扣费
    let currentBalance = rl.balance
    if (isApiKeyMode && userId !== null) {
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
    const category = searchParams.get('cid')
    const limit  = Math.min(parseInt(searchParams.get('limit')  || '12'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    // 总数
    let countQuery = `SELECT COUNT(*) as total FROM nodes n`
    const countParams: any[] = []
    if (category) { countQuery += ` WHERE n.category_name = $1`; countParams.push(category) }
    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].total)

    // 节点列表（按 display_order 排序，支持首页自定义排序）
    const params: any[] = []
    let nodesQuery = `
      SELECT n.id, n.hashid, n.name, n.url, n.logo,
             n.category_id, n.category_name, n.display_name,
             n.created_at, n.updated_at, n.display_order,
             (SELECT COUNT(*) FROM items WHERE node_hashid = n.hashid) as items_count,
             (SELECT MAX(created_at) FROM items WHERE node_hashid = n.hashid) as latest_item_time
      FROM nodes n`
    if (category) { nodesQuery += ` WHERE n.category_name = $1`; params.push(category) }
    nodesQuery += ` ORDER BY n.display_order ASC NULLS LAST, n.category_name, n.name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const nodesResult = await pool.query(nodesQuery, params)

    const nodes = await Promise.all(
      nodesResult.rows.map(async (node) => {
        const itemsResult = await pool.query(
          `SELECT id, title, url, hot_value, rank, thumbnail, description, created_at
           FROM items WHERE node_hashid = $1 ORDER BY rank LIMIT 50`,
          [node.hashid]
        )
        const platform = {
          id: node.hashid, name: node.name,
          displayName: node.display_name || node.name,
          category: node.category_name, url: node.url, logo: node.logo || null,
        }
        return {
          id: node.id.toString(), hashid: node.hashid,
          name: node.name, displayName: node.display_name || node.name,
          url: node.url, logo: node.logo,
          categoryId: node.category_id, categoryName: node.category_name,
          platform,
          items: itemsResult.rows.map((item) => ({
            id: item.id.toString(), title: item.title, url: item.url,
            hotValue: item.hot_value, hotText: item.hot_value ? formatHot(item.hot_value) : '',
            rank: item.rank, thumbnail: item.thumbnail, description: item.description,
            created_at: item.created_at, platform,
          })),
          itemsCount: parseInt(node.items_count) || 0,
          updatedAt: node.latest_item_time ? new Date(node.latest_item_time).toISOString() : (node.updated_at ? new Date(node.updated_at).toISOString() : new Date().toISOString()),
          createdAt: node.created_at?.toISOString() || new Date().toISOString(),
        }
      })
    )

    return NextResponse.json({
      success: true, data: nodes, total, offset, limit,
      hasMore: offset + nodes.length < total,
      rateLimit: { plan: rl.plan, limit: rl.limit, used: rl.used, remaining: currentBalance, balance: currentBalance, resetAt: rl.resetAt },
      ...(isApiKeyMode ? { _auth: { userId, keyName: apiKeyName } } : {}),
    })
  } catch (error: any) {
    console.error('[API] /api/nodes error:', error)
    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 })
  }
}

function formatHot(v: number): string {
  if (v >= 1e8) return `${(v / 1e8).toFixed(1)}亿`
  if (v >= 1e4) return `${(v / 1e4).toFixed(0)}万`
  return v.toLocaleString()
}
