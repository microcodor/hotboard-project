/**
 * HotBoard 全平台数据抓取脚本
 * 支持：微博、知乎、头条、掘金、抖音、少数派、36氪、腾讯新闻、人民日报、新华社
 */

const HOTBOARD_URL = 'http://localhost:3000';

// ============================================================
// 工具函数
// ============================================================

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

/** 标准化 rank：传入的 rank 仅作参考，导入后会按热度重新排 */
function withRank(items: any[], start = 1): any[] {
  return items.map((item, i) => ({ ...item, rank: start + i }))
}

// ============================================================
// 各平台抓取函数
// ============================================================

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
};

// 微博热搜
async function fetchWeibo() {
  const res = await fetch('https://weibo.com/ajax/side/hotSearch', {
    headers: { ...HEADERS, 'Referer': 'https://weibo.com/' },
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  const items = data?.data?.realtime || [];
  return items.slice(0, 50).map((item: any, idx: number) => ({
    title: item.word || item.note || '',
    url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word || '')}`,
    hot_value: item.num || 0,
    rank: idx + 1,
    description: item.label_name || '',
    thumbnail: '',
  })).filter((i: any) => i.title);
}

// 知乎热榜
async function fetchZhihu() {
  const res = await fetch('https://www.zhihu.com/api/v4/creators/rank/hot?domain=0&limit=50', {
    headers: { ...HEADERS, 'Referer': 'https://www.zhihu.com/' },
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  const items = data?.data || [];
  return items.map((item: any, idx: number) => ({
    title: item.question?.title || item.title || '',
    url: item.question?.url || `https://www.zhihu.com/question/${item.question?.id}`,
    hot_value: item.heat_value || 0,
    rank: idx + 1,
    description: item.excerpt || '',
    thumbnail: item.question?.thumbnail || '',
  })).filter((i: any) => i.title);
}

// 头条热榜
async function fetchToutiao() {
  const res = await fetch('https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc', {
    headers: { ...HEADERS, 'Referer': 'https://www.toutiao.com/' },
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  const items = data?.data || [];
  return items.slice(0, 50).map((item: any, idx: number) => ({
    title: item.Title || '',
    url: item.Url || `https://www.toutiao.com/trending/${item.ClusterId}/`,
    hot_value: item.HotValue || 0,
    rank: idx + 1,
    description: item.LabelDesc || '',
    thumbnail: item.Image?.url || '',
  })).filter((i: any) => i.title);
}

// 掘金热榜
async function fetchJuejin() {
  const res = await fetch('https://api.juejin.cn/recommend_api/v1/article/recommend_cate_feed', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json', 'Referer': 'https://juejin.cn/' },
    body: JSON.stringify({ id_type: 2, sort_type: 200, cate_id: '6809637767543259144', cursor: '0', limit: 30 }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  const items = data?.data || [];
  return items.map((item: any, idx: number) => ({
    title: item.article_info?.title || '',
    url: `https://juejin.cn/post/${item.article_id}`,
    hot_value: item.article_info?.view_count || 0,
    rank: idx + 1,
    description: item.article_info?.brief_content || '',
    thumbnail: item.article_info?.cover_image || '',
  })).filter((i: any) => i.title);
}

// 抖音热点
async function fetchDouyin() {
  const res = await fetch('https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383&channel=channel_pc_web', {
    headers: { ...HEADERS, 'Referer': 'https://www.douyin.com/' },
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  const items = data?.data?.word_list || [];
  return items.slice(0, 50).map((item: any, idx: number) => ({
    title: item.word || '',
    url: `https://www.douyin.com/search/${encodeURIComponent(item.word || '')}`,
    hot_value: item.hot_value || 0,
    rank: idx + 1,
    description: item.label || '',
    thumbnail: '',
  })).filter((i: any) => i.title);
}

// 少数派 RSS
async function fetchSspai() {
  const res = await fetch('https://sspai.com/feed', {
    headers: { ...HEADERS, 'Accept': 'application/rss+xml, application/xml, text/xml, */*', 'Referer': 'https://sspai.com/' },
    signal: AbortSignal.timeout(10000),
  });
  const xml = await res.text();
  // 简单 XML 解析
  const items: any[] = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  let rank = 1;
  for (const match of itemMatches) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || block.match(/<title>(.*?)<\/title>/)?.[1] || '';
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] || block.match(/<guid>(.*?)<\/guid>/)?.[1] || '';
    const desc = block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]?.replace(/<[^>]+>/g, '').substring(0, 100) || '';
    if (title) {
      items.push({ title: title.trim(), url: link.trim(), hot_value: 0, rank: rank++, description: desc.trim(), thumbnail: '' });
    }
    if (items.length >= 20) break;
  }
  return items;
}

// 36氪 - 使用 RSS
async function fetch36kr() {
  const res = await fetch('https://36kr.com/feed', {
    headers: { ...HEADERS, 'Accept': 'application/rss+xml, application/xml, text/xml, */*', 'Referer': 'https://36kr.com/' },
    signal: AbortSignal.timeout(10000),
  });
  const xml = await res.text();
  const items: any[] = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  let rank = 1;
  for (const match of itemMatches) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || block.match(/<title>(.*?)<\/title>/)?.[1] || '';
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] || '';
    const desc = block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]?.replace(/<[^>]+>/g, '').substring(0, 100) || '';
    if (title) {
      items.push({ title: title.trim(), url: link.trim(), hot_value: 0, rank: rank++, description: desc.trim(), thumbnail: '' });
    }
    if (items.length >= 20) break;
  }
  return items;
}

// 虎嗅 - 使用 RSS
async function fetchHuxiu() {
  const res = await fetch('https://www.huxiu.com/rss/article.xml', {
    headers: { ...HEADERS, 'Accept': 'application/rss+xml, application/xml, text/xml, */*', 'Referer': 'https://www.huxiu.com/' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const items: any[] = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  let rank = 1;
  for (const match of itemMatches) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || block.match(/<title>(.*?)<\/title>/)?.[1] || '';
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] || '';
    if (title) {
      items.push({ title: title.trim(), url: link.trim(), hot_value: 0, rank: rank++, description: '', thumbnail: '' });
    }
    if (items.length >= 20) break;
  }
  return items;
}

// ============================================================
// 同步到 HotBoard
// ============================================================

async function syncToHotBoard(platform: string, items: any[]) {
  const res = await fetch(`${HOTBOARD_URL}/api/crawl/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform, items }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '同步失败');
  return data;
}

// 腾讯新闻热榜
async function fetchTencent() {
  const res = await fetch('https://r.inews.qq.com/gw/event/hot_ranking_list?page_size=30', {
    headers: { ...HEADERS, 'Referer': 'https://news.qq.com/' },
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  const items = (data?.idlist?.[0]?.newslist || []).filter((i: any) => i.title && i.hotEvent?.hotScore > 0);
  return items.slice(0, 30).map((item: any, idx: number) => ({
    title: item.title || '',
    url: item.url || `https://news.qq.com/rain/a/${item.id}.htm`,
    hot_value: item.hotEvent?.hotScore || item.hotScore || 0,
    rank: idx + 1,
    description: item.abstract || item.desc || '',
    thumbnail: item.thumbnails?.image?.[0]?.url || item.thumbnail || '',
  })).filter((i: any) => i.title);
}

// 人民日报（RSS 聚合多个频道）
async function fetchPeopleDaily() {
  const RSS_URLS = [
    'http://www.people.com.cn/rss/politics.xml',
    'http://www.people.com.cn/rss/world.xml',
    'http://www.people.com.cn/rss/society.xml',
  ];
  const allItems: any[] = [];
  for (const url of RSS_URLS) {
    try {
      const res = await fetch(url, {
        headers: { ...HEADERS, 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
        signal: AbortSignal.timeout(8000),
      });
      const xml = await res.text();
      const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
      for (const m of matches) {
        const block = m[1];
        const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
          || block.match(/<title>(.*?)<\/title>/)?.[1] || '';
        const link = block.match(/<link>(.*?)<\/link>/)?.[1] || '';
        const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
        if (title?.trim()) {
          allItems.push({ title: title.trim(), url: link.trim(), pubDate, hot_value: 0 });
        }
        if (allItems.length >= 30) break;
      }
    } catch {}
    if (allItems.length >= 30) break;
    await new Promise(r => setTimeout(r, 300));
  }
  // 去重
  const seen = new Set<string>();
  return allItems
    .filter(i => { if (seen.has(i.title)) return false; seen.add(i.title); return true; })
    .slice(0, 30)
    .map((item, idx) => ({ ...item, rank: idx + 1, description: '', thumbnail: '' }));
}

// 新华社（RSS 聚合多个频道）
async function fetchXinhua() {
  const RSS_URLS = [
    'http://www.xinhuanet.com/world/news_world.xml',
    'http://www.xinhuanet.com/politics/news_politics.xml',
    'http://www.xinhuanet.com/society/news_society.xml',
  ];
  const allItems: any[] = [];
  for (const url of RSS_URLS) {
    try {
      const res = await fetch(url, {
        headers: { ...HEADERS, 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
        signal: AbortSignal.timeout(8000),
      });
      const xml = await res.text();
      const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
      for (const m of matches) {
        const block = m[1];
        const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
          || block.match(/<title>(.*?)<\/title>/)?.[1] || '';
        const link = block.match(/<link>(.*?)<\/link>/)?.[1]
          || block.match(/<guid>(.*?)<\/guid>/)?.[1] || '';
        if (title?.trim() && !title.includes('<a href')) {
          allItems.push({ title: title.trim(), url: link.trim(), hot_value: 0 });
        }
        if (allItems.length >= 30) break;
      }
    } catch {}
    if (allItems.length >= 30) break;
    await new Promise(r => setTimeout(r, 300));
  }
  const seen = new Set<string>();
  return allItems
    .filter(i => { if (seen.has(i.title)) return false; seen.add(i.title); return true; })
    .slice(0, 30)
    .map((item, idx) => ({ ...item, rank: idx + 1, description: '', thumbnail: '' }));
}

// ============================================================
// 国外平台抓取函数
// ============================================================

// GitHub Trending（近7天最热仓库）
async function fetchGitHub() {
  const since = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const res = await fetch(
    `https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=25`,
    {
      headers: {
        'User-Agent': 'HotBoard/1.0',
        'Accept': 'application/vnd.github.v3+json',
      },
      signal: AbortSignal.timeout(10000),
    }
  );
  const data = await res.json();
  return (data.items || []).map((item: any, idx: number) => ({
    title: `${item.full_name} — ${item.description?.substring(0, 60) || 'No description'}`,
    url: item.html_url,
    hot_value: item.stargazers_count,
    rank: idx + 1,
    description: `⭐ ${item.stargazers_count} stars | ${item.language || 'Unknown'} | ${item.description?.substring(0, 80) || ''}`,
    thumbnail: item.owner?.avatar_url || '',
  }));
}

// Dev.to 热门文章（近7天）
async function fetchDevTo() {
  const res = await fetch('https://dev.to/api/articles?top=7&per_page=25', {
    headers: { 'User-Agent': 'HotBoard/1.0', 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  return (data || []).map((item: any, idx: number) => ({
    title: item.title || '',
    url: item.url || `https://dev.to${item.path}`,
    hot_value: item.positive_reactions_count || 0,
    rank: idx + 1,
    description: `❤️ ${item.positive_reactions_count} | 💬 ${item.comments_count} | by ${item.user?.name}`,
    thumbnail: item.cover_image || item.social_image || '',
  })).filter((i: any) => i.title);
}

// Lobsters 热门
async function fetchLobsters() {
  const res = await fetch('https://lobste.rs/hottest.json', {
    headers: { 'User-Agent': 'HotBoard/1.0', 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  return (data || []).map((item: any, idx: number) => ({
    title: item.title || '',
    url: item.url || `https://lobste.rs${item.short_id_url}`,
    hot_value: item.score || 0,
    rank: idx + 1,
    description: `🔺 ${item.score} | 💬 ${item.comment_count} | ${item.tags?.join(', ')}`,
    thumbnail: '',
  })).filter((i: any) => i.title);
}

// Hacker News Best Stories（质量最高）
async function fetchHNBest() {
  const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/beststories.json', {
    headers: { 'User-Agent': 'HotBoard/1.0' },
    signal: AbortSignal.timeout(10000),
  });
  const ids: number[] = await idsRes.json();
  // 并发获取前25条详情
  const items = await Promise.all(
    ids.slice(0, 25).map((id) =>
      fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
        headers: { 'User-Agent': 'HotBoard/1.0' },
        signal: AbortSignal.timeout(8000),
      }).then(r => r.json()).catch(() => null)
    )
  );
  return items
    .filter((i: any) => i && i.title && i.url)
    .map((item: any, idx: number) => ({
      title: item.title,
      url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
      hot_value: item.score || 0,
      rank: idx + 1,
      description: `🔺 ${item.score} points | 💬 ${item.descendants || 0} comments`,
      thumbnail: '',
    }));
}

// ============================================================
// 主流程
// ============================================================

const PLATFORMS = [
  // 国内平台
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
  // 国外平台
  { id: 'github-trending', name: 'GitHub Trending', fetch: fetchGitHub },
  { id: 'devto-hot',       name: 'Dev.to',           fetch: fetchDevTo },
  { id: 'lobsters-hot',    name: 'Lobsters',         fetch: fetchLobsters },
  { id: 'hn-best',         name: 'HN Best',          fetch: fetchHNBest },
];

async function main() {
  const target = process.argv[2]; // 可指定单个平台
  const list = target ? PLATFORMS.filter(p => p.id === target) : PLATFORMS;

  console.log('\n🚀 HotBoard 全平台数据抓取');
  console.log(`📡 目标: ${HOTBOARD_URL}`);
  console.log(`⏰ 时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('='.repeat(60));

  const results: any[] = [];

  for (const p of list) {
    process.stdout.write(`📡 ${p.name.padEnd(10)} 抓取中... `);
    try {
      const raw    = await p.fetch();
      const deduped = dedupItems(raw);                    // 批次内去重
      const items  = withRank(deduped);                  // 统一编 rank
      const diff   = raw.length - deduped.length;
      process.stdout.write(`抓取${raw.length}条${diff > 0 ? `(去重-${diff})` : ''} → 同步中... `);
      await syncToHotBoard(p.id, items);
      console.log(`✅ 同步成功`);
      results.push({ name: p.name, count: items.length, success: true });
    } catch (e: any) {
      console.log(`❌ ${e.message}`);
      results.push({ name: p.name, count: 0, success: false, error: e.message });
    }
    await new Promise(r => setTimeout(r, 800));
  }

  console.log('\n' + '='.repeat(60));
  const ok = results.filter(r => r.success);
  const fail = results.filter(r => !r.success);
  console.log(`✅ 成功: ${ok.length}/${results.length}`);
  ok.forEach(r => console.log(`   ${r.name}: ${r.count}条`));
  if (fail.length > 0) {
    console.log(`❌ 失败: ${fail.length}/${results.length}`);
    fail.forEach(r => console.log(`   ${r.name}: ${r.error}`));
  }
  console.log('='.repeat(60));
}

main().catch(console.error);
