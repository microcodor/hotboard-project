/**
 * HotBoard 抓取核心模块
 * 
 * 提供可调用的抓取函数，不依赖外部进程
 * 支持：微博、知乎、头条、掘金、抖音、少数派、36氪、腾讯新闻、人民日报、新华社、GitHub、Dev.to、Lobsters、HN Best
 */

import { HOTBOARD_URL } from './crawl-config'

// ============================================================
// 工具函数
// ============================================================

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
}

/** 对单批次结果按 title 去重（保留第一个） */
function dedupItems(items: any[]): any[] {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = (item.title || '').trim().toLowerCase()
    if (!key) return false
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** 同步数据到 HotBoard */
async function syncToHotBoard(platform: string, items: any[]) {
  const res = await fetch(`${HOTBOARD_URL}/api/crawl/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform, items }),
    signal: AbortSignal.timeout(30000),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || '同步失败')
  return data
}

// ============================================================
// 各平台抓取函数
// ============================================================

export async function fetchWeibo() {
  const res = await fetch('https://weibo.com/ajax/side/hotSearch', {
    headers: { ...HEADERS, 'Referer': 'https://weibo.com/' },
    signal: AbortSignal.timeout(10000),
  })
  const data = await res.json()
  const items = data?.data?.realtime || []
  return items.slice(0, 50).map((item: any, idx: number) => ({
    title: item.word || item.note || '',
    url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word || '')}`,
    hot: item.num || 0,
    rank: idx + 1,
    description: item.label_name || '',
  })).filter((i: any) => i.title)
}

export async function fetchZhihu() {
  const res = await fetch('https://www.zhihu.com/api/v4/creators/rank/hot?domain=0&limit=50', {
    headers: { ...HEADERS, 'Referer': 'https://www.zhihu.com/' },
    signal: AbortSignal.timeout(10000),
  })
  const data = await res.json()
  const items = data?.data || []
  return items.map((item: any, idx: number) => ({
    title: item.question?.title || item.title || '',
    url: item.question?.url || `https://www.zhihu.com/question/${item.question?.id}`,
    hot: item.heat_value || 0,
    rank: idx + 1,
    description: item.excerpt || '',
  })).filter((i: any) => i.title)
}

export async function fetchToutiao() {
  const res = await fetch('https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc', {
    headers: { ...HEADERS, 'Referer': 'https://www.toutiao.com/' },
    signal: AbortSignal.timeout(10000),
  })
  const data = await res.json()
  const items = data?.data || []
  return items.slice(0, 50).map((item: any, idx: number) => ({
    title: item.Title || '',
    url: item.Url || `https://www.toutiao.com/trending/${item.ClusterId}/`,
    hot: item.HotValue || 0,
    rank: idx + 1,
    description: item.LabelDesc || '',
  })).filter((i: any) => i.title)
}

export async function fetchJuejin() {
  const res = await fetch('https://api.juejin.cn/recommend_api/v1/article/recommend_cate_feed', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json', 'Referer': 'https://juejin.cn/' },
    body: JSON.stringify({ id_type: 2, sort_type: 200, cate_id: '6809637767543259144', cursor: '0', limit: 30 }),
    signal: AbortSignal.timeout(10000),
  })
  const data = await res.json()
  const items = data?.data || []
  return items.map((item: any, idx: number) => ({
    title: item.article_info?.title || '',
    url: `https://juejin.cn/post/${item.article_id}`,
    hot: item.article_info?.view_count || 0,
    rank: idx + 1,
    description: item.article_info?.brief_content || '',
  })).filter((i: any) => i.title)
}

export async function fetchDouyin() {
  const res = await fetch('https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383&channel=channel_pc_web', {
    headers: { ...HEADERS, 'Referer': 'https://www.douyin.com/' },
    signal: AbortSignal.timeout(10000),
  })
  const data = await res.json()
  const items = data?.data?.word_list || []
  return items.slice(0, 50).map((item: any, idx: number) => ({
    title: item.word || '',
    url: `https://www.douyin.com/search/${encodeURIComponent(item.word || '')}`,
    hot: item.hot_value || 0,
    rank: idx + 1,
    description: item.label || '',
  })).filter((i: any) => i.title)
}

export async function fetchSspai() {
  const res = await fetch('https://sspai.com/feed', {
    headers: { ...HEADERS, 'Accept': 'application/rss+xml, application/xml, text/xml, */*', 'Referer': 'https://sspai.com/' },
    signal: AbortSignal.timeout(10000),
  })
  const xml = await res.text()
  const items: any[] = []
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)
  let rank = 1
  for (const match of itemMatches) {
    const block = match[1]
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || block.match(/<title>(.*?)<\/title>/)?.[1] || ''
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] || block.match(/<guid>(.*?)<\/guid>/)?.[1] || ''
    const desc = block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]?.replace(/<[^>]+>/g, '').substring(0, 100) || ''
    if (title) {
      items.push({ title: title.trim(), url: link.trim(), hot: 0, rank: rank++, description: desc.trim() })
    }
    if (items.length >= 20) break
  }
  return items
}

export async function fetch36kr() {
  const res = await fetch('https://36kr.com/feed', {
    headers: { ...HEADERS, 'Accept': 'application/rss+xml, application/xml, text/xml, */*', 'Referer': 'https://36kr.com/' },
    signal: AbortSignal.timeout(10000),
  })
  const xml = await res.text()
  const items: any[] = []
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)
  let rank = 1
  for (const match of itemMatches) {
    const block = match[1]
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || block.match(/<title>(.*?)<\/title>/)?.[1] || ''
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] || ''
    const desc = block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]?.replace(/<[^>]+>/g, '').substring(0, 100) || ''
    if (title) {
      items.push({ title: title.trim(), url: link.trim(), hot: 0, rank: rank++, description: desc.trim() })
    }
    if (items.length >= 20) break
  }
  return items
}

export async function fetchTencent() {
  const res = await fetch('https://r.inews.qq.com/gw/event/hot_ranking_list?page_size=30', {
    headers: { ...HEADERS, 'Referer': 'https://news.qq.com/' },
    signal: AbortSignal.timeout(10000),
  })
  const data = await res.json()
  const items = (data?.idlist?.[0]?.newslist || []).filter((i: any) => i.title && i.hotEvent?.hotScore > 0)
  return items.slice(0, 30).map((item: any, idx: number) => ({
    title: item.title || '',
    url: item.url || `https://news.qq.com/rain/a/${item.id}.htm`,
    hot: item.hotEvent?.hotScore || item.hotScore || 0,
    rank: idx + 1,
    description: item.abstract || item.desc || '',
  })).filter((i: any) => i.title)
}

export async function fetchPeopleDaily() {
  const RSS_URLS = [
    'http://www.people.com.cn/rss/politics.xml',
    'http://www.people.com.cn/rss/world.xml',
    'http://www.people.com.cn/rss/society.xml',
  ]
  const allItems: any[] = []
  for (const url of RSS_URLS) {
    try {
      const res = await fetch(url, {
        headers: { ...HEADERS, 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
        signal: AbortSignal.timeout(8000),
      })
      const xml = await res.text()
      const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)
      for (const m of matches) {
        const block = m[1]
        const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || block.match(/<title>(.*?)<\/title>/)?.[1] || ''
        const link = block.match(/<link>(.*?)<\/link>/)?.[1] || ''
        if (title?.trim()) {
          allItems.push({ title: title.trim(), url: link.trim(), hot: 0 })
        }
        if (allItems.length >= 30) break
      }
    } catch {}
    if (allItems.length >= 30) break
    await new Promise(r => setTimeout(r, 300))
  }
  const seen = new Set<string>()
  return allItems.filter(i => { if (seen.has(i.title)) return false; seen.add(i.title); return true })
    .slice(0, 30).map((item, idx) => ({ ...item, rank: idx + 1, description: '' }))
}

export async function fetchXinhua() {
  const RSS_URLS = [
    'http://www.xinhuanet.com/world/news_world.xml',
    'http://www.xinhuanet.com/politics/news_politics.xml',
    'http://www.xinhuanet.com/society/news_society.xml',
  ]
  const allItems: any[] = []
  for (const url of RSS_URLS) {
    try {
      const res = await fetch(url, {
        headers: { ...HEADERS, 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
        signal: AbortSignal.timeout(8000),
      })
      const xml = await res.text()
      const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)
      for (const m of matches) {
        const block = m[1]
        const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || block.match(/<title>(.*?)<\/title>/)?.[1] || ''
        const link = block.match(/<link>(.*?)<\/link>/)?.[1] || block.match(/<guid>(.*?)<\/guid>/)?.[1] || ''
        if (title?.trim() && !title.includes('<a href')) {
          allItems.push({ title: title.trim(), url: link.trim(), hot: 0 })
        }
        if (allItems.length >= 30) break
      }
    } catch {}
    if (allItems.length >= 30) break
    await new Promise(r => setTimeout(r, 300))
  }
  const seen = new Set<string>()
  return allItems.filter(i => { if (seen.has(i.title)) return false; seen.add(i.title); return true })
    .slice(0, 30).map((item, idx) => ({ ...item, rank: idx + 1, description: '' }))
}

// 国外平台
export async function fetchGitHub() {
  const since = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const res = await fetch(
    `https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=25`,
    {
      headers: { 'User-Agent': 'HotBoard/1.0', 'Accept': 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(10000),
    }
  )
  const data = await res.json()
  return (data.items || []).map((item: any, idx: number) => ({
    title: `${item.full_name} — ${item.description?.substring(0, 60) || 'No description'}`,
    url: item.html_url,
    hot: item.stargazers_count,
    rank: idx + 1,
    description: `⭐ ${item.stargazers_count} | ${item.language || 'Unknown'}`,
  }))
}

export async function fetchDevTo() {
  const res = await fetch('https://dev.to/api/articles?top=7&per_page=25', {
    headers: { 'User-Agent': 'HotBoard/1.0', 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10000),
  })
  const data = await res.json()
  return (data || []).map((item: any, idx: number) => ({
    title: item.title || '',
    url: item.url || `https://dev.to${item.path}`,
    hot: item.positive_reactions_count || 0,
    rank: idx + 1,
    description: `❤️ ${item.positive_reactions_count} | 💬 ${item.comments_count}`,
  })).filter((i: any) => i.title)
}

export async function fetchLobsters() {
  const res = await fetch('https://lobste.rs/hottest.json', {
    headers: { 'User-Agent': 'HotBoard/1.0', 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10000),
  })
  const data = await res.json()
  return (data || []).map((item: any, idx: number) => ({
    title: item.title || '',
    url: item.url || `https://lobste.rs${item.short_id_url}`,
    hot: item.score || 0,
    rank: idx + 1,
    description: `🔺 ${item.score} | 💬 ${item.comment_count}`,
  })).filter((i: any) => i.title)
}

export async function fetchHNBest() {
  const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/beststories.json', {
    headers: { 'User-Agent': 'HotBoard/1.0' },
    signal: AbortSignal.timeout(10000),
  })
  const ids: number[] = await idsRes.json()
  const items = await Promise.all(
    ids.slice(0, 25).map((id) =>
      fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
        headers: { 'User-Agent': 'HotBoard/1.0' },
        signal: AbortSignal.timeout(8000),
      }).then(r => r.json()).catch(() => null)
    )
  )
  return items.filter((i: any) => i && i.title && i.url)
    .map((item: any, idx: number) => ({
      title: item.title,
      url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
      hot: item.score || 0,
      rank: idx + 1,
      description: `🔺 ${item.score} | 💬 ${item.descendants || 0}`,
    }))
}


// ============================================================
// 补充平台抓取函数
// ============================================================

export async function fetchBaidu() {
  const res = await fetch('https://top.baidu.com/board?tab=realtime', {
    headers: HEADERS,
    signal: AbortSignal.timeout(15000),
  })
  const html = await res.text()
  const items: any[] = []
  const regex = /<div class="category-wrap_iQLoo horizontal_1eKyQ"><a[^>]*href="([^"]+)"[^>]*>.*?<div class="c-single-text-ellipsis">([^<]+)<\/div>/gs
  let match
  while ((match = regex.exec(html)) !== null) {
    items.push({
      title: match[2].trim(),
      url: match[1],
      hotValue: 0,
    })
  }
  // 备用：使用API
  if (items.length === 0) {
    const apiRes = await fetch('https://api.vvhan.com/api/hotlist/baiduRD', {
      headers: HEADERS,
      signal: AbortSignal.timeout(15000),
    })
    const data = await apiRes.json()
    if (data.success && data.data) {
      for (const item of data.data.slice(0, 30)) {
        items.push({
          title: item.title,
          url: item.url,
          hotValue: item.hot || 0,
        })
      }
    }
  }
  return items
}

export async function fetchBilibili() {
  const res = await fetch('https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all', {
    headers: { ...HEADERS, Referer: 'https://www.bilibili.com/' },
    signal: AbortSignal.timeout(15000),
  })
  const data = await res.json()
  const items: any[] = []
  if (data.data && data.data.list) {
    for (const item of data.data.list.slice(0, 50)) {
      items.push({
        title: item.title,
        url: `https://www.bilibili.com/video/${item.bvid}`,
        hotValue: item.stat.view,
        thumbnail: item.pic,
      })
    }
  }
  return items
}

export async function fetchDouban() {
  const res = await fetch('https://movie.douban.com/j/search_subjects?type=movie&tag=%E7%83%AD%E9%97%A8&page_limit=50&page_start=0', {
    headers: { ...HEADERS, Referer: 'https://movie.douban.com/' },
    signal: AbortSignal.timeout(15000),
  })
  const data = await res.json()
  const items: any[] = []
  if (data.subjects) {
    for (const item of data.subjects.slice(0, 30)) {
      items.push({
        title: item.title,
        url: item.url,
        hotValue: item.rate ? parseFloat(item.rate) * 10000 : 0,
        thumbnail: item.cover,
      })
    }
  }
  return items
}

export async function fetchThepaper() {
  const res = await fetch('https://cache.thepaper.cn/contentapi/wwwIndex/rightSidebar', {
    headers: HEADERS,
    signal: AbortSignal.timeout(15000),
  })
  const data = await res.json()
  const items: any[] = []
  if (data.data && data.data.hotNews) {
    for (const item of data.data.hotNews.slice(0, 30)) {
      items.push({
        title: item.name,
        url: `https://www.thepaper.cn/newsDetail_forward_${item.contId}`,
        hotValue: 0,
      })
    }
  }
  return items
}

export async function fetchHN() {
  const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
    signal: AbortSignal.timeout(15000),
  })
  const ids = await res.json()
  const items: any[] = []
  const topIds = ids.slice(0, 30)
  for (const id of topIds) {
    try {
      const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
        signal: AbortSignal.timeout(10000),
      })
      const story = await storyRes.json()
      if (story) {
        items.push({
          title: story.title,
          url: story.url || `https://news.ycombinator.com/item?id=${id}`,
          hotValue: story.score || 0,
        })
      }
    } catch {}
  }
  return items
}


// ============================================================
// 平台配置
// ============================================================

export const PLATFORMS = [
  { id: 'weibo-hot',      name: '微博热搜',   fetch: fetchWeibo },
  { id: 'zhihu-hot',      name: '知乎热榜',   fetch: fetchZhihu },
  { id: 'toutiao-hot',    name: '头条热榜',   fetch: fetchToutiao },
  { id: 'juejin-hot',     name: '掘金热榜',   fetch: fetchJuejin },
  { id: 'douyin-hot',     name: '抖音热点',   fetch: fetchDouyin },
  { id: 'sspai-hot',      name: '少数派',     fetch: fetchSspai },
  { id: '36kr-hot',       name: '36氪',       fetch: fetch36kr },
  { id: 'tencent-hot',    name: '腾讯新闻',   fetch: fetchTencent },
  { id: 'people-hot',     name: '人民日报',   fetch: fetchPeopleDaily },
  { id: 'xinhua-hot',     name: '新华社',     fetch: fetchXinhua },
  { id: 'github-trending', name: 'GitHub',    fetch: fetchGitHub },
  { id: 'devto-hot',       name: 'Dev.to',    fetch: fetchDevTo },
  { id: 'lobsters-hot',    name: 'Lobsters',  fetch: fetchLobsters },
  { id: 'hn-best',         name: 'HN Best',  fetch: fetchHNBest },
  { id: 'baidu-hot',      name: '百度热搜',   fetch: fetchBaidu },
  { id: 'bilibili-hot',   name: 'B站热门',    fetch: fetchBilibili },
  { id: 'douban-movie',   name: '豆瓣电影',   fetch: fetchDouban },
  { id: 'thepaper-hot',   name: '澎湃新闻',   fetch: fetchThepaper },
  { id: 'hn-hot',         name: 'Hacker News', fetch: fetchHN },

]

// ============================================================
// 主流程
// ============================================================

export interface CrawlResult {
  name: string
  success: boolean
  count: number
  error?: string
}

export async function crawlAll(): Promise<CrawlResult[]> {
  const results: CrawlResult[] = []

  for (const p of PLATFORMS) {
    try {
      const raw = await p.fetch()
      const deduped = dedupItems(raw)
      const items = deduped.map((item, i) => ({ ...item, rank: i + 1 }))
      
      await syncToHotBoard(p.id, items)
      results.push({ name: p.name, success: true, count: items.length })
      console.log(`✅ ${p.name}: ${items.length}条`)
    } catch (e: any) {
      results.push({ name: p.name, success: false, count: 0, error: e.message })
      console.log(`❌ ${p.name}: ${e.message}`)
    }
    await new Promise(r => setTimeout(r, 500))
  }

  return results
}
