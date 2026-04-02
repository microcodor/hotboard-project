/**
 * 榜中榜 API
 * GET /api/hot?range=day&limit=100&page=1&pageSize=20&minSources=1
 *
 * 跨平台热度计算逻辑：
 *   1. 查询时间范围内的所有 items
 *   2. 按标准化标题聚合（去除空格/标点，前50字符匹配）
 *   3. 计算综合热度得分：
 *        score = (平台出现次数 × 10 + 平均热度 × 0.0001 + 最高热度 × 0.00005) × 时间衰减
 *   4. 按得分降序，截取 top N
 *   5. 内存缓存 5 分钟
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db-pg'

interface HotRankingItem {
  title: string; url: string; thumbnail: string | null
  description: string | null; score: number; rank: number
  sources: string[]; source_count: number
  avg_hot_value: number; max_hot_value: number
}

// 内存缓存 { key → { data, expireAt } }
const memCache = new Map<string, { data: HotRankingItem[]; expireAt: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 分钟

function getCache(key: string): HotRankingItem[] | null {
  const entry = memCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expireAt) { memCache.delete(key); return null }
  return entry.data
}
function setCache(key: string, data: HotRankingItem[]) {
  memCache.set(key, { data, expireAt: Date.now() + CACHE_TTL })
}

// 时间范围 → 起始时间
function getTimeStart(range: string): Date {
  const now = Date.now()
  switch (range) {
    case 'hour': return new Date(now - 60 * 60 * 1000)
    case 'day':  return new Date(now - 24 * 60 * 60 * 1000)
    case 'week': return new Date(now - 7 * 24 * 60 * 60 * 1000)
    case 'month':return new Date(now - 30 * 24 * 60 * 60 * 1000)
    default:     return new Date(now - 24 * 60 * 60 * 1000)
  }
}

// 标题标准化（用于聚合匹配）
function normalizeTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .replace(/[\s\-\_\.\,\!\?\:\;\"\'\(\)\[\]\{\}]/g, '')
    .substring(0, 50)
}

// 计算综合热度得分
function calcScore(sources: number, avgHot: number, maxHot: number, range: string): number {
  const decay: Record<string, number> = { hour: 1.0, day: 0.95, week: 0.8, month: 0.6 }
  const d = decay[range] ?? 0.95
  return Math.round((sources * 10 + avgHot * 0.0001 + maxHot * 0.00005) * d)
}

export async function GET(request: NextRequest) {
  try {
    const sp    = request.nextUrl.searchParams
    const range   = (['hour','day','week','month'].includes(sp.get('range') || '') ? sp.get('range') : 'day') as string
    const limit    = Math.min(200, Math.max(1, parseInt(sp.get('limit')  || '100')))
    const page     = Math.max(1, parseInt(sp.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') || '20')))
    const minSrc   = Math.max(1, parseInt(sp.get('minSources') || '1'))
    const nodesParam = sp.get('nodes') || ''

    const cacheKey = `hot:${range}:${limit}:${minSrc}:${nodesParam}`
    const cached = getCache(cacheKey)
    if (cached) {
      const from = (page - 1) * pageSize
      return NextResponse.json({
        success: true,
        data: {
          items: cached.slice(from, from + pageSize),
          total: cached.length,
          page, pageSize,
          hasMore: from + pageSize < cached.length,
          generatedAt: new Date().toISOString(),
          timeRange: { start: getTimeStart(range).toISOString(), end: new Date().toISOString() },
        },
      })
    }

    // 查询时间范围内的 items
    const timeStart = getTimeStart(range)
    const params: any[] = [timeStart]
    let idx = 2

    let query = `
      SELECT i.title, i.url, i.thumbnail, i.description,
             i.hot_value, i.node_hashid, i.created_at,
             n.name as platform_name
      FROM items i
      LEFT JOIN nodes n ON n.hashid = i.node_hashid
      WHERE i.created_at >= $1`

    if (nodesParam) {
      const hashes = nodesParam.split(',').map(s => s.trim()).filter(Boolean)
      if (hashes.length > 0) {
        query += ` AND i.node_hashid = ANY($${idx})`
        params.push(hashes); idx++
      }
    }

    query += ` ORDER BY i.created_at DESC`

    const { rows: items } = await pool.query(query, params)
    if (!items || items.length === 0) {
      return NextResponse.json({
        success: true,
        data: { items: [], total: 0, page, pageSize, hasMore: false, generatedAt: new Date().toISOString() },
      })
    }

    // 按标准化标题聚合
    const groups = new Map<string, {
      titles: string[]; urls: string[]; thumbnails: string[]; descriptions: string[]
      hotValues: number[]; sources: Set<string>; createdAts: string[]
    }>()

    for (const item of items) {
      const key = normalizeTitle(item.title)
      if (!key) continue
      if (!groups.has(key)) {
        groups.set(key, {
          titles: [], urls: [], thumbnails: [], descriptions: [],
          hotValues: [], sources: new Set(), createdAts: [],
        })
      }
      const g = groups.get(key)!
      g.titles.push(item.title)
      g.urls.push(item.url || '')
      if (item.thumbnail) g.thumbnails.push(item.thumbnail)
      if (item.description) g.descriptions.push(item.description)
      if (item.hot_value) g.hotValues.push(Number(item.hot_value))
      g.sources.add(item.platform_name || item.node_hashid)
      g.createdAts.push(item.created_at)
    }

    // 计算得分并生成排行
    const ranking: HotRankingItem[] = []
    for (const [, g] of groups) {
      if (g.sources.size < minSrc) continue

      const avgHot = g.hotValues.length > 0
        ? g.hotValues.reduce((a, b) => a + b, 0) / g.hotValues.length : 0
      const maxHot = g.hotValues.length > 0 ? Math.max(...g.hotValues) : 0
      const score = calcScore(g.sources.size, avgHot, maxHot, range)

      // 选最完整的标题（最长的）
      const bestTitle   = g.titles.reduce((a, b) => a.length >= b.length ? a : b)
      const bestUrl     = g.urls[0]
      const bestThumb   = g.thumbnails[0] || null
      const bestDesc    = g.descriptions.reduce((a, b) => a.length >= b.length ? a : b, '') || null

      ranking.push({
        title: bestTitle, url: bestUrl, thumbnail: bestThumb,
        description: bestDesc, score, rank: 0,
        sources: Array.from(g.sources),
        source_count: g.sources.size,
        avg_hot_value: Math.round(avgHot),
        max_hot_value: maxHot,
      })
    }

    // 得分降序
    ranking.sort((a, b) => b.score - a.score)
    ranking.forEach((item, i) => { item.rank = i + 1 })

    // 分页截取（page 从 1 开始）
    const from    = (page - 1) * pageSize
    const paged   = ranking.slice(from, from + pageSize)

    setCache(cacheKey, ranking)

    return NextResponse.json({
      success: true,
      data: {
        items: paged,
        total: ranking.length,
        page, pageSize,
        hasMore: from + pageSize < ranking.length,
        generatedAt: new Date().toISOString(),
        timeRange: { start: timeStart.toISOString(), end: new Date().toISOString() },
      },
    })
  } catch (e: any) {
    console.error('[/api/hot]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
