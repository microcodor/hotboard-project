/**
 * 测试开放的数据源
 * 使用各种公开API和RSS源
 */

const OPEN_SOURCES: Record<string, any> = {
  // 1. RSS 源 - 最稳定
  rss_zhihu: {
    name: '知乎日报(RSS)',
    url: 'https://www.zhihu.com/rss',
    type: 'rss',
  },
  
  rss_weibo: {
    name: '微博热搜(RSSHub)',
    url: 'https://rsshub.app/weibo/search/hot',
    type: 'rss',
  },
  
  rss_bilibili: {
    name: 'B站热门(RSSHub)',
    url: 'https://rsshub.app/bilibili/ranking/0/0/3',
    type: 'rss',
  },
  
  rss_douyin: {
    name: '抖音热点(RSSHub)',
    url: 'https://rsshub.app/douyin/trending',
    type: 'rss',
  },
  
  rss_v2ex: {
    name: 'V2EX(RSSHub)',
    url: 'https://rsshub.app/v2ex/topics/hot',
    type: 'rss',
  },
  
  // 2. 开放API
  github_trending: {
    name: 'GitHub Trending',
    url: 'https://api.gitterapp.com/repositories?language=javascript&since=daily',
    type: 'api',
  },
  
  producthunt: {
    name: 'ProductHunt',
    url: 'https://api.producthunt.com/v2/api/graphql',
    type: 'graphql',
  },
  
  // 3. 官方开放API
  dev_to: {
    name: 'Dev.to热门',
    url: 'https://dev.to/api/articles?per_page=10&top=1',
    type: 'api',
  },
  
  hashnode: {
    name: 'Hashnode热门',
    url: 'https://api.hashnode.com/',
    type: 'graphql',
  },
  
  // 4. 国内开放数据
  today_in_history: {
    name: '历史上的今天',
    url: 'https://api.oick.cn/lishi/api.php',
    type: 'api',
  },
  
  daily_quote: {
    name: '每日一句',
    url: 'https://api.oick.cn/yiyan/api.php',
    type: 'api',
  },
  
  // 5. 新闻源
  newsapi: {
    name: 'NewsAPI(需Key)',
    url: 'https://newsapi.org/v2/top-headlines?country=cn&apiKey=YOUR_KEY',
    type: 'api',
  },
};

// 测试 RSS 源
async function testRSS(name: string, url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }
    
    const text = await res.text();
    
    // 简单解析RSS
    const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
    const titles = items.slice(0, 5).map(item => {
      const match = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || 
                    item.match(/<title>(.*?)<\/title>/);
      return match ? match[1] : '';
    }).filter(Boolean);
    
    return {
      success: true,
      count: items.length,
      sample: titles
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 测试 API 源
async function testAPI(name: string, url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }
    
    const data = await res.json();
    
    // 尝试提取标题
    let items: any[] = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data.data) {
      items = Array.isArray(data.data) ? data.data : [data.data];
    } else if (data.articles) {
      items = data.articles;
    } else if (data.items) {
      items = data.items;
    }
    
    const sample = items.slice(0, 3).map((item: any) => 
      item.title || item.name || item.repository_name || JSON.stringify(item).substring(0, 50)
    );
    
    return {
      success: true,
      count: items.length,
      sample
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('\n🔍 测试开放数据源\n');
  console.log('时间:', new Date().toLocaleString('zh-CN'));
  
  const results: any[] = [];
  
  // 测试 RSS 源
  console.log('\n📡 RSS 源测试:');
  console.log('='.repeat(60));
  
  for (const [key, source] of Object.entries(OPEN_SOURCES)) {
    if (source.type !== 'rss') continue;
    
    process.stdout.write(`测试 ${source.name}... `);
    const result = await testRSS(source.name, source.url);
    
    if (result.success) {
      console.log(`✅ ${result.count}条`);
      if (result.sample?.length > 0) {
        result.sample.forEach((t: string) => console.log(`   - ${t.substring(0, 40)}`));
      }
    } else {
      console.log(`❌ ${result.error}`);
    }
    
    results.push({ name: source.name, ...result });
    await new Promise(r => setTimeout(r, 500));
  }
  
  // 测试 API 源
  console.log('\n\n🌐 API 源测试:');
  console.log('='.repeat(60));
  
  for (const [key, source] of Object.entries(OPEN_SOURCES)) {
    if (source.type !== 'api') continue;
    
    process.stdout.write(`测试 ${source.name}... `);
    const result = await testAPI(source.name, source.url);
    
    if (result.success) {
      console.log(`✅ ${result.count}条`);
      if (result.sample?.length > 0) {
        result.sample.forEach((t: string) => console.log(`   - ${t.substring(0, 40)}`));
      }
    } else {
      console.log(`❌ ${result.error}`);
    }
    
    results.push({ name: source.name, ...result });
    await new Promise(r => setTimeout(r, 500));
  }
  
  // 汇总
  console.log('\n\n' + '='.repeat(60));
  console.log('📋 测试汇总');
  console.log('='.repeat(60));
  
  const success = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`${status} ${r.name.padEnd(20)} | ${r.success ? `${r.count}条` : r.error}`);
  });
  
  console.log(`\n📈 成功率: ${success}/${results.length} (${Math.round(success/results.length*100)}%)`);
}

main().catch(console.error);
