/**
 * 管理后台 - 抓取任务 API
 * 
 * 内置抓取，不依赖外部进程或 Worker
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'
import pool from '@/lib/db-pg'

const HOTBOARD_URL = process.env.HOTBOARD_URL || 'http://localhost:3000'

// ============================================================
// 内置抓取函数
// ============================================================

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
}

function dedupItems(items: any[]) {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = (item.title || '').trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function syncToHotBoard(platform: string, items: any[]) {
  const res = await fetch(`${HOTBOARD_URL}/api/crawl/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform, items }),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || '同步失败')
  return data
}

// 平台抓取函数
const platformFetchers = {
  'weibo-hot': async () => {
    const r = await fetch('https://weibo.com/ajax/side/hotSearch', { headers: { ...HEADERS, 'Referer': 'https://weibo.com/' } })
    const d = await r.json()
    return (d?.data?.realtime || []).slice(0, 50).map((item: any, i: number) => ({ title: item.word || item.note || '', url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word || '')}`, hot: item.num || 0, rank: i + 1, description: item.label_name || '' })).filter((i: any) => i.title)
  },
  'zhihu-hot': async () => {
    const r = await fetch('https://www.zhihu.com/api/v4/creators/rank/hot?domain=0&limit=50', { headers: { ...HEADERS, 'Referer': 'https://www.zhihu.com/' } })
    const d = await r.json()
    return (d?.data || []).map((item: any, i: number) => ({ title: item.question?.title || '', url: item.question?.url || '', hot: item.heat_value || 0, rank: i + 1, description: item.excerpt || '' })).filter((i: any) => i.title)
  },
  'toutiao-hot': async () => {
    const r = await fetch('https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc', { headers: { ...HEADERS, 'Referer': 'https://www.toutiao.com/' } })
    const d = await r.json()
    return (d?.data || []).slice(0, 50).map((item: any, i: number) => ({ title: item.Title || '', url: item.Url || '', hot: item.HotValue || 0, rank: i + 1, description: item.LabelDesc || '' })).filter((i: any) => i.title)
  },
  'juejin-hot': async () => {
    const r = await fetch('https://api.juejin.cn/recommend_api/v1/article/recommend_cate_feed', {
      method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json', 'Referer': 'https://juejin.cn/' },
      body: JSON.stringify({ id_type: 2, sort_type: 200, cate_id: '6809637767543259144', cursor: '0', limit: 30 }),
    })
    const d = await r.json()
    return (d?.data || []).map((item: any, i: number) => ({ title: item.article_info?.title || '', url: `https://juejin.cn/post/${item.article_id}`, hot: item.article_info?.view_count || 0, rank: i + 1, description: item.article_info?.brief_content || '' })).filter((i: any) => i.title)
  },
  'douyin-hot': async () => {
    const r = await fetch('https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383&channel=channel_pc_web', { headers: { ...HEADERS, 'Referer': 'https://www.douyin.com/' } })
    const d = await r.json()
    return (d?.data?.word_list || []).slice(0, 50).map((item: any, i: number) => ({ title: item.word || '', url: `https://www.douyin.com/search/${encodeURIComponent(item.word || '')}`, hot: item.hot_value || 0, rank: i + 1, description: item.label || '' })).filter((i: any) => i.title)
  },
  'sspai-hot': async () => {
    const r = await fetch('https://sspai.com/feed', { headers: { ...HEADERS, 'Accept': 'application/rss+xml,*/*', 'Referer': 'https://sspai.com/' } })
    const xml = await r.text()
    const items: any[] = []
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const title = m[1].match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] || ''
      const link = m[1].match(/<link>(.*?)<\/link>/)?.[1] || ''
      if (title) items.push({ title: title.trim(), url: link.trim(), hot: 0, rank: items.length + 1, description: '' })
      if (items.length >= 20) break
    }
    return items
  },
  '36kr-hot': async () => {
    const r = await fetch('https://36kr.com/feed', { headers: { ...HEADERS, 'Accept': 'application/rss+xml,*/*', 'Referer': 'https://36kr.com/' } })
    const xml = await r.text()
    const items: any[] = []
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const title = m[1].match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] || ''
      const link = m[1].match(/<link>(.*?)<\/link>/)?.[1] || ''
      if (title) items.push({ title: title.trim(), url: link.trim(), hot: 0, rank: items.length + 1, description: '' })
      if (items.length >= 20) break
    }
    return items
  },
  'tencent-hot': async () => {
    const r = await fetch('https://r.inews.qq.com/gw/event/hot_ranking_list?page_size=30', { headers: { ...HEADERS, 'Referer': 'https://news.qq.com/' } })
    const d = await r.json()
    return (d?.idlist?.[0]?.newslist || []).filter((i: any) => i.title).slice(0, 30).map((item: any, i: number) => ({ title: item.title || '', url: item.url || '', hot: item.hotEvent?.hotScore || 0, rank: i + 1, description: item.abstract || '' }))
  },
  'people-hot': async () => {
    const rssUrls = ['http://www.people.com.cn/rss/politics.xml', 'http://www.people.com.cn/rss/world.xml', 'http://www.people.com.cn/rss/society.xml']
    const all: any[] = []
    for (const url of rssUrls) {
      try {
        const r = await fetch(url, { headers: { ...HEADERS, 'Accept': 'application/rss+xml,*/*' } })
        const xml = await r.text()
        for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
          const title = m[1].match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] || ''
          const link = m[1].match(/<link>(.*?)<\/link>/)?.[1] || ''
          if (title?.trim()) all.push({ title: title.trim(), url: link.trim(), hot: 0 })
          if (all.length >= 30) break
        }
      } catch {}
      if (all.length >= 30) break
      await new Promise(r => setTimeout(r, 300))
    }
    const seen = new Set()
    return all.filter(i => { if (seen.has(i.title)) return false; seen.add(i.title); return true }).slice(0, 30)
      .map((item: any, i: number) => ({ ...item, rank: i + 1, description: '' }))
  },
  'xinhua-hot': async () => {
    const rssUrls = ['http://www.xinhuanet.com/world/news_world.xml', 'http://www.xinhuanet.com/politics/news_politics.xml', 'http://www.xinhuanet.com/society/news_society.xml']
    const all: any[] = []
    for (const url of rssUrls) {
      try {
        const r = await fetch(url, { headers: { ...HEADERS, 'Accept': 'application/rss+xml,*/*' } })
        const xml = await r.text()
        for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
          const title = m[1].match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] || ''
          const link = m[1].match(/<link>(.*?)<\/link>/)?.[1] || ''
          if (title?.trim() && !title.includes('<a href')) all.push({ title: title.trim(), url: link.trim(), hot: 0 })
          if (all.length >= 30) break
        }
      } catch {}
      if (all.length >= 30) break
      await new Promise(r => setTimeout(r, 300))
    }
    const seen = new Set()
    return all.filter(i => { if (seen.has(i.title)) return false; seen.add(i.title); return true }).slice(0, 30)
      .map((item: any, i: number) => ({ ...item, rank: i + 1, description: '' }))
  },
  'baidu-hot': async () => {
    const r = await fetch('https://top.baidu.com/api/board?tab=realtime', { headers: { ...HEADERS } })
    const d = await r.json()
    return (d?.data?.cards?.[0]?.content || []).slice(0, 50).map((item: any, i: number) => ({
      title: item.word || '', url: item.url || `https://www.baidu.com/s?wd=${encodeURIComponent(item.word || '')}`,
      hot: item.hotScore || 0, rank: i + 1, description: item.desc || ''
    })).filter((i: any) => i.title)
  },
  'bilibili-hot': async () => {
    const r = await fetch('https://api.bilibili.com/x/web-interface/popular?ps=50&pn=1', { headers: { ...HEADERS, 'Referer': 'https://www.bilibili.com' } })
    const d = await r.json()
    return ((d?.data?.archives || d?.data?.list) || []).slice(0, 50).map((item: any, i: number) => ({
      title: item.title || '', url: `https://www.bilibili.com/video/${item.bvid}`,
      hot: item.stat?.view || 0, rank: i + 1, description: `${(item.stat?.view || 0) / 10000}万播放`
    })).filter((i: any) => i.title)
  },
  'douban-movie': async () => {
    const r = await fetch('https://movie.douban.com/j/search_subjects?type=movie&tag=热门&page_limit=20', { headers: { ...HEADERS } })
    const d = await r.json()
    return (d?.subjects || []).map((item: any, i: number) => ({
      title: item.title || '', url: item.url,
      hot: item.rate ? Math.round(parseFloat(item.rate) * 1000) : 0, rank: i + 1, description: `评分 ${item.rate}`
    }))
  },
  'thepaper-hot': async () => {
    const r = await fetch('https://cache.thepaper.cn/contentapi/wwwIndex/rightSidebar', { headers: { ...HEADERS } })
    const d = await r.json()
    return (d?.data?.hotNews || []).slice(0, 30).map((item: any, i: number) => ({
      title: item.name || '', url: `https://www.thepaper.cn/newsDetail_forward_${item.contId}`,
      hot: item.interactionNum || 0, rank: i + 1, description: item.summary || ''
    }))
  },
  'hn-hot': async () => {
    const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', { headers: { 'User-Agent': 'HotBoard/1.0' } })
    const ids = await idsRes.json()
    const items = await Promise.all(ids.slice(0, 30).map((id: number) => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { headers: { 'User-Agent': 'HotBoard/1.0' } }).then(r => r.json()).catch(() => null)))
    return items.filter((i: any) => i && i.title).map((item: any, i: number) => ({ title: item.title, url: item.url || '', hot: item.score || 0, rank: i + 1, description: `🔺 ${item.score} | 💬 ${item.descendants || 0}` }))
  },
  'github-trending': async () => {
    const since = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const r = await fetch(`https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=25`, { headers: { 'User-Agent': 'HotBoard/1.0', 'Accept': 'application/vnd.github.v3+json' } })
    const d = await r.json()
    return (d.items || []).map((item: any, i: number) => ({ title: `${item.full_name} — ${(item.description || '').substring(0, 60)}`, url: item.html_url, hot: item.stargazers_count, rank: i + 1, description: `⭐ ${item.stargazers_count}` }))
  },
  'devto-hot': async () => {
    const r = await fetch('https://dev.to/api/articles?top=7&per_page=25', { headers: { 'User-Agent': 'HotBoard/1.0' } })
    const d = await r.json()
    return (d || []).map((item: any, i: number) => ({ title: item.title || '', url: item.url || '', hot: item.positive_reactions_count || 0, rank: i + 1, description: `❤️ ${item.positive_reactions_count}` })).filter((i: any) => i.title)
  },
  'lobsters-hot': async () => {
    const r = await fetch('https://lobste.rs/hottest.json', { headers: { 'User-Agent': 'HotBoard/1.0' } })
    const d = await r.json()
    return (d || []).map((item: any, i: number) => ({ title: item.title || '', url: item.url || '', hot: item.score || 0, rank: i + 1, description: `🔺 ${item.score}` })).filter((i: any) => i.title)
  },
  'hn-best': async () => {
    const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/beststories.json', { headers: { 'User-Agent': 'HotBoard/1.0' } })
    const ids = await idsRes.json()
    const items = await Promise.all(ids.slice(0, 25).map((id: number) => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { headers: { 'User-Agent': 'HotBoard/1.0' } }).then(r => r.json()).catch(() => null)))
    return items.filter((i: any) => i && i.title).map((item: any, i: number) => ({ title: item.title, url: item.url || '', hot: item.score || 0, rank: i + 1, description: `🔺 ${item.score}` }))
  },
}

const platformNames: Record<string, string> = {
  'weibo-hot': '微博热搜', 'zhihu-hot': '知乎热榜', 'toutiao-hot': '头条热榜',
  'juejin-hot': '掘金热榜', 'douyin-hot': '抖音热点', 'sspai-hot': '少数派',
  '36kr-hot': '36氪', 'tencent-hot': '腾讯新闻', 'people-hot': '人民日报',
  'xinhua-hot': '新华社', 'github-trending': 'GitHub', 'devto-hot': 'Dev.to',
  'lobsters-hot': 'Lobsters', 'hn-best': 'HN Best', 'baidu-hot': '百度热搜',
  'bilibili-hot': 'B站热门', 'douban-movie': '豆瓣电影', 'thepaper-hot': '澎湃新闻',
  'hn-hot': 'Hacker News',
}

async function runCrawl() {
  const results: any[] = []
  for (const [id, fetchFn] of Object.entries(platformFetchers)) {
    try {
      const raw = await (fetchFn as () => Promise<any[]>)()
      const deduped = dedupItems(raw)
      const items = deduped.map((item, i) => ({ ...item, rank: i + 1 }))
      await syncToHotBoard(id, items)
      results.push({ id, name: platformNames[id] || id, success: true, count: items.length })
    } catch (e: any) {
      results.push({ id, name: platformNames[id] || id, success: false, count: 0, error: e.message })
    }
    await new Promise(r => setTimeout(r, 500))
  }
  return results
}

// ============================================================
// API 路由
// ============================================================

export async function GET(request: NextRequest) {
  try {
    verifyAdminToken(request)
    const result = await pool.query(`
      SELECT id, node_hashid, status, items_count, duration_ms, error_message, created_at
      FROM sync_logs
      ORDER BY created_at DESC
      LIMIT 50
    `)
    return NextResponse.json({ success: true, data: result.rows })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    verifyAdminToken(request)

    console.log('[抓取] 开始执行全量抓取...')
    const startTime = Date.now()
    const results = await runCrawl()
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    const successCount = results.filter(r => r.success).length
    const totalItems = results.reduce((sum, r) => sum + (r.count || 0), 0)

    console.log(`[抓取] 完成：${successCount}/${results.length} 平台，${totalItems} 条，耗时 ${duration}s`)

    return NextResponse.json({
      success: true,
      message: `抓取完成：${successCount}/${results.length} 平台成功，共 ${totalItems} 条数据（耗时 ${duration}s）`,
      data: { total: results.length, success: successCount, failed: results.length - successCount, totalItems, duration, results },
    })

  } catch (e: any) {
    console.error('[抓取] 失败:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
