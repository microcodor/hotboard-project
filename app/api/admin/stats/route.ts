/**
 * 管理后台 - 仪表盘统计 API
 * GET /api/admin/stats
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db-pg'
import { verifyAdminToken } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    verifyAdminToken(request)

    const [users, platforms, items, todayItems, cards, subs] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL \'1 day\') as today FROM users'),
      pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '2 hours') as active FROM nodes"),
      pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as today FROM items"),
      pool.query("SELECT node_hashid, COUNT(*) as cnt FROM items WHERE created_at > NOW() - INTERVAL '1 day' GROUP BY node_hashid ORDER BY cnt DESC LIMIT 5"),
      pool.query("SELECT status, COUNT(*) as cnt FROM card_keys GROUP BY status"),
      pool.query("SELECT p.slug, COUNT(*) as cnt FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.status = 'active' GROUP BY p.slug"),
    ])

    // 近7天每日抓取量（补全缺失日期为0）
    const trendRaw = await pool.query(`
      SELECT DATE(created_at AT TIME ZONE 'Asia/Shanghai') as date, COUNT(*) as count
      FROM items
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at AT TIME ZONE 'Asia/Shanghai')
      ORDER BY date ASC
    `)
    const trendMap = Object.fromEntries(trendRaw.rows.map((r: any) => [r.date.toISOString().slice(0, 10), parseInt(r.count)]))
    const trend = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      const key = d.toISOString().slice(0, 10)
      return { date: key, count: trendMap[key] || 0 }
    })

    const cardStats = Object.fromEntries(cards.rows.map((r: any) => [r.status, parseInt(r.cnt)]))
    const subStats = Object.fromEntries(subs.rows.map((r: any) => [r.slug, parseInt(r.cnt)]))

    return NextResponse.json({
      success: true,
      stats: {
        users: { total: parseInt(users.rows[0].total), today: parseInt(users.rows[0].today) },
        platforms: { total: parseInt(platforms.rows[0].total), active: parseInt(platforms.rows[0].active) },
        items: { total: parseInt(items.rows[0].total), today: parseInt(items.rows[0].today) },
        cards: { unused: cardStats.unused || 0, used: cardStats.used || 0, disabled: cardStats.disabled || 0 },
        subscriptions: subStats,
        trend,
        topPlatforms: todayItems.rows.map((r: any) => ({ hashid: r.node_hashid, count: parseInt(r.cnt) })),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}
