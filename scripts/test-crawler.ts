/**
 * 数据抓取测试脚本
 * 测试各个平台的 API 是否可用
 */

// 平台配置
const PLATFORMS: Record<string, any> = {
  zhihu: {
    name: '知乎热榜',
    url: 'https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total',
    parse: (data: any) => {
      return data.data.map((item: any, index: number) => ({
        rank: index + 1,
        title: item.target.title,
        url: `https://www.zhihu.com/question/${item.target.id}`,
        hot: item.detail_text,
        excerpt: item.target.excerpt?.substring(0, 50),
      }));
    }
  },
  
  baidu: {
    name: '百度热搜',
    url: 'https://top.baidu.com/api/board?tab=realtime',
    parse: (data: any) => {
      return data.data.cards[0].content.map((item: any, index: number) => ({
        rank: index + 1,
        title: item.word,
        url: item.url,
        hot: `${item.hotScore}热度`,
      }));
    }
  },
  
  bilibili: {
    name: 'B站热门',
    url: 'https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all',
    headers: {
      'Referer': 'https://www.bilibili.com'
    },
    parse: (data: any) => {
      return data.data.list.slice(0, 10).map((item: any, index: number) => ({
        rank: index + 1,
        title: item.title,
        url: `https://www.bilibili.com/video/${item.bvid}`,
        hot: `${item.stat.view}播放`,
        author: item.owner.name,
      }));
    }
  },
  
  v2ex: {
    name: 'V2EX',
    url: 'https://www.v2ex.com/api/topics/hot.json',
    parse: (data: any) => {
      return data.slice(0, 10).map((item: any, index: number) => ({
        rank: index + 1,
        title: item.title,
        url: item.url,
        hot: `${item.replies}回复`,
        node: item.node.title,
      }));
    }
  },
  
  hackernews: {
    name: 'Hacker News',
    url: 'https://hacker-news.firebaseio.com/v0/topstories.json',
    parse: async (ids: number[]) => {
      const items = [];
      for (let i = 0; i < Math.min(10, ids.length); i++) {
        const id = ids[i];
        const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        const story = await res.json();
        items.push({
          rank: i + 1,
          title: story.title,
          url: story.url || `https://news.ycombinator.com/item?id=${id}`,
          hot: `${story.score} points`,
          by: story.by,
        });
      }
      return items;
    }
  },
};

async function testPlatform(key: string) {
  const platform = PLATFORMS[key];
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📡 测试: ${platform.name}`);
  console.log(`🔗 URL: ${platform.url}`);
  console.log('='.repeat(60));
  
  try {
    const startTime = Date.now();
    const response = await fetch(platform.url, {
      headers: platform.headers || {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const items = await (typeof platform.parse === 'function' 
      ? platform.parse(data) 
      : data);
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ 成功! 耗时: ${duration}ms`);
    console.log(`📊 获取 ${Array.isArray(items) ? items.length : 0} 条数据\n`);
    
    // 显示前 5 条
    const display = Array.isArray(items) ? items.slice(0, 5) : [items];
    display.forEach((item: any, i: number) => {
      console.log(`${item.rank || i + 1}. ${item.title}`);
      console.log(`   🔗 ${item.url?.substring(0, 60)}${item.url?.length > 60 ? '...' : ''}`);
      console.log(`   🔥 ${item.hot || 'N/A'}`);
      if (item.excerpt) console.log(`   📝 ${item.excerpt}...`);
      console.log();
    });
    
    return { success: true, count: Array.isArray(items) ? items.length : 1, duration };
    
  } catch (error: any) {
    console.log(`❌ 失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('\n🚀 HotBoard 数据抓取测试\n');
  console.log('测试时间:', new Date().toLocaleString('zh-CN'));
  
  const results: Record<string, any> = {};
  
  for (const key of Object.keys(PLATFORMS)) {
    results[key] = await testPlatform(key);
    // 延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 汇总报告
  console.log('\n' + '='.repeat(60));
  console.log('📋 测试报告汇总');
  console.log('='.repeat(60));
  
  let success = 0;
  let failed = 0;
  
  for (const [key, result] of Object.entries(results)) {
    const platform = PLATFORMS[key];
    const status = result.success ? '✅' : '❌';
    const info = result.success 
      ? `${result.count}条 | ${result.duration}ms`
      : result.error;
    console.log(`${status} ${platform.name.padEnd(15)} | ${info}`);
    
    if (result.success) success++;
    else failed++;
  }
  
  console.log('\n📈 成功率:', `${success}/${success + failed} (${Math.round(success / (success + failed) * 100)}%)`);
  console.log('\n✨ 测试完成!\n');
}

main().catch(console.error);
