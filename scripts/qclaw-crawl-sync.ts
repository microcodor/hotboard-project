#!/usr/bin/env node
/**
 * QClaw 热点数据抓取 + 同步脚本
 * 
 * 功能：
 * 1. 抓取各平台热点数据（使用 QClaw 的网络能力）
 * 2. 自动同步到 HotBoard 数据库
 * 
 * 运行方式：
 *   npx tsx scripts/qclaw-crawl-sync.ts
 *   npx tsx scripts/qclaw-crawl-sync.ts --platform zhihu-hot
 *   npx tsx scripts/qclaw-crawl-sync.ts --all
 */

const HOTBOARD_URL = process.env.HOTBOARD_URL || 'http://localhost:3000';
const HOTBOARD_API_KEY = process.env.HOTBOARD_API_KEY || '';

// ============================================================
// 各平台抓取函数
// ============================================================

async function crawlBaidu() {
  const res = await fetch('https://top.baidu.com/api/board?tab=realtime', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const data = await res.json();
  return data.data.cards[0].content.map((item: any, i: number) => ({
    title: item.word,
    url: item.url || `https://www.baidu.com/s?wd=${encodeURIComponent(item.word)}`,
    hot: item.hotScore || 0,
    hotText: `${item.hotScore}热度`,
    rank: i + 1,
    description: item.desc || '',
  }));
}

async function crawlBilibili() {
  const res = await fetch('https://api.bilibili.com/x/web-interface/popular?ps=50&pn=1', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.bilibili.com'
    }
  });
  const data = await res.json();
  return (data.data.archives || data.data.list || []).map((item: any, i: number) => ({
    title: item.title,
    url: `https://www.bilibili.com/video/${item.bvid}`,
    hot: item.stat?.view || 0,
    hotText: `${item.stat?.view || 0}播放`,
    rank: i + 1,
    thumbnail: item.pic,
    description: item.desc?.substring(0, 100),
  }));
}

async function crawlDouban() {
  const res = await fetch('https://movie.douban.com/j/search_subjects?type=movie&tag=热门&page_limit=20', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const data = await res.json();
  return data.subjects.map((item: any, i: number) => ({
    title: item.title,
    url: item.url,
    hot: item.rate ? Math.round(parseFloat(item.rate) * 1000) : 0,
    hotText: `评分 ${item.rate}`,
    rank: i + 1,
    thumbnail: item.cover,
    description: `${item.rate}分`,
  }));
}

async function crawlThepaper() {
  const res = await fetch('https://cache.thepaper.cn/contentapi/wwwIndex/rightSidebar', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const data = await res.json();
  return data.data.hotNews.map((item: any, i: number) => ({
    title: item.name,
    url: `https://www.thepaper.cn/newsDetail_forward_${item.contId}`,
    hot: item.interactionNum || 0,
    hotText: `${item.interactionNum || 0}互动`,
    rank: i + 1,
    thumbnail: item.pic || '',
    description: item.summary || '',
  }));
}

async function crawlHackerNews() {
  const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
  const ids: number[] = await res.json();
  const items = [];
  for (let i = 0; i < Math.min(30, ids.length); i++) {
    const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${ids[i]}.json`);
    const story = await storyRes.json();
    items.push({
      title: story.title,
      url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
      hot: story.score || 0,
      hotText: `${story.score} points`,
      rank: i + 1,
      description: `by ${story.by} | ${story.descendants || 0} comments`,
    });
  }
  return items;
}

// ============================================================
// 平台配置
// ============================================================

const PLATFORMS: Record<string, { name: string; crawl: () => Promise<any[]> }> = {
  'baidu-hot': { name: '百度热搜', crawl: crawlBaidu },
  'bilibili-hot': { name: 'B站热门', crawl: crawlBilibili },
  'douban-movie': { name: '豆瓣电影', crawl: crawlDouban },
  'thepaper-hot': { name: '澎湃新闻', crawl: crawlThepaper },
  'hn-hot': { name: 'Hacker News', crawl: crawlHackerNews },
};

// ============================================================
// 同步到 HotBoard
// ============================================================

async function syncToHotBoard(platform: string, items: any[]) {
  const res = await fetch(`${HOTBOARD_URL}/api/crawl/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      platform,
      items,
      source: 'qclaw-crawler',
      apiKey: HOTBOARD_API_KEY,
    }),
  });
  return await res.json();
}

// ============================================================
// 工具函数
// ============================================================

function dedupItems(items: any[]): { items: any[]; removed: number } {
  const seen = new Set<string>()
  const unique: any[] = []
  for (const item of items) {
    const key = (item.title || '').trim().toLowerCase()
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key); unique.push(item)
  }
  return { items: unique, removed: items.length - unique.length }
}

// ============================================================
// 主函数
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const platformArg = args.find(a => a.startsWith('--platform='))?.split('=')[1];
  const runAll = args.includes('--all') || args.length === 0;

  console.log('\n🚀 QClaw 热点数据抓取 + 同步\n');
  console.log(`📡 HotBoard: ${HOTBOARD_URL}`);
  console.log(`⏰ 时间: ${new Date().toLocaleString('zh-CN')}\n`);

  const targets = platformArg
    ? { [platformArg]: PLATFORMS[platformArg] }
    : PLATFORMS;

  const results: any[] = [];

  for (const [id, config] of Object.entries(targets)) {
    if (!config) {
      console.log(`❌ 未知平台: ${id}`);
      continue;
    }

    process.stdout.write(`📡 ${config.name.padEnd(12)} 抓取中... `);

    try {
      const raw = await config.crawl();
      const { items, removed } = dedupItems(raw);
      const label = removed > 0 ? `${raw.length}条(去重-${removed})` : `${raw.length}条`
      process.stdout.write(`✅ ${label} → 同步中... `);

      const syncResult = await syncToHotBoard(id, items);

      if (syncResult.success) {
        console.log(`✅ 同步成功`);
        results.push({ platform: id, name: config.name, success: true, count: items.length });
      } else {
        console.log(`❌ 同步失败: ${syncResult.error}`);
        results.push({ platform: id, name: config.name, success: false, error: syncResult.error });
      }
    } catch (error: any) {
      console.log(`❌ 失败: ${error.message}`);
      results.push({ platform: id, name: config.name, success: false, error: error.message });
    }

    await new Promise(r => setTimeout(r, 500));
  }

  // 汇总
  console.log('\n' + '='.repeat(50));
  const success = results.filter(r => r.success).length;
  console.log(`✅ 成功: ${success}/${results.length}`);
  results.filter(r => r.success).forEach(r => console.log(`   ${r.name}: ${r.count}条`));
  if (results.some(r => !r.success)) {
    console.log(`❌ 失败: ${results.filter(r => !r.success).length}/${results.length}`);
    results.filter(r => !r.success).forEach(r => console.log(`   ${r.name}: ${r.error}`));
  }
  console.log('='.repeat(50) + '\n');
}

main().catch(console.error);
