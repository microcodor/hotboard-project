/**
 * 测试国内可用的开放数据源
 */

const CN_SOURCES = [
  {
    name: '百度热搜',
    url: 'https://top.baidu.com/api/board?tab=realtime',
    parse: (data: any) => data?.data?.cards?.[0]?.content?.slice(0, 5).map((i: any) => i.word)
  },
  {
    name: '微博热搜(极速版)',
    url: 'https://weibo.com/ajax/side/hotSearch',
    parse: (data: any) => data?.data?.realtime?.slice(0, 5).map((i: any) => i.note || i.word)
  },
  {
    name: '头条热榜',
    url: 'https://www.toutiao.com/hot-event/',
    parse: (data: any) => data?.data?.slice(0, 5).map((i: any) => i.Title)
  },
  {
    name: '36氪热榜',
    url: 'https://gateway.36kr.com/api/mis/nav/home/nav/hotList',
    parse: (data: any) => data?.data?.list?.slice(0, 5).map((i: any) => i.title)
  },
  {
    name: '虎嗅热榜',
    url: 'https://www.huxiu.com/v2_action/article_list',
    parse: (data: any) => data?.data?.slice(0, 5).map((i: any) => i.title)
  },
  {
    name: 'IT之家',
    url: 'https://api.ithome.com/json/hot/d.json',
    parse: (data: any) => data?.slice(0, 5).map((i: any) => i.title)
  },
  {
    name: '知乎热榜',
    url: 'https://www.zhihu.com/billboard',
    parse: (data: any) => data?.data?.slice(0, 5).map((i: any) => i.title)
  },
  {
    name: '少数派',
    url: 'https://sspai.com/api/v1/article?limit=10',
    parse: (data: any) => data?.list?.slice(0, 5).map((i: any) => i.title)
  },
  {
    name: '掘金热榜',
    url: 'https://api.juejin.cn/recommend_api/v1/article/recommend_cate_feed',
    parse: (data: any) => data?.data?.slice(0, 5).map((i: any) => i.article_info?.title)
  },
  {
    name: 'B站热榜',
    url: 'https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all',
    parse: (data: any) => data?.data?.list?.slice(0, 5).map((i: any) => i.title)
  },
  {
    name: '豆瓣电影热榜',
    url: 'https://movie.douban.com/j/search_subjects?type=movie&tag=热门&page_limit=10',
    parse: (data: any) => data?.subjects?.slice(0, 5).map((i: any) => i.title)
  },
  {
    name: '澎湃新闻',
    url: 'https://cache.thepaper.cn/contentapi/wwwIndex/rightSidebar',
    parse: (data: any) => data?.data?.hotNews?.slice(0, 5).map((i: any) => i.name)
  },
];

async function testSource(source: any) {
  try {
    const res = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      redirect: 'follow'
    });
    
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}`, data: null };
    }
    
    const contentType = res.headers.get('content-type') || '';
    let data: any;
    
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      return { success: false, error: 'Not JSON', data: text.substring(0, 100) };
    }
    
    const items = source.parse(data);
    
    return {
      success: true,
      count: items?.length || 0,
      sample: items || [],
      data: data
    };
  } catch (error: any) {
    return { success: false, error: error.message, data: null };
  }
}

async function main() {
  console.log('\n🔍 测试国内开放数据源\n');
  console.log('时间:', new Date().toLocaleString('zh-CN'));
  console.log('='.repeat(70));
  
  const results: any[] = [];
  
  for (const source of CN_SOURCES) {
    process.stdout.write(`📡 ${source.name.padEnd(12)} ... `);
    
    const result = await testSource(source);
    
    if (result.success && result.count > 0) {
      console.log(`✅ ${result.count}条`);
      result.sample?.forEach((item: string) => {
        if (item) console.log(`   • ${item.substring(0, 45)}`);
      });
    } else {
      console.log(`❌ ${result.error}`);
    }
    
    results.push({ name: source.name, ...result });
    console.log();
    
    await new Promise(r => setTimeout(r, 800));
  }
  
  // 汇总
  console.log('='.repeat(70));
  console.log('📋 测试汇总\n');
  
  const success = results.filter(r => r.success && r.count > 0);
  const failed = results.filter(r => !r.success || r.count === 0);
  
  console.log('✅ 可用数据源:');
  success.forEach(r => console.log(`   ${r.name} - ${r.count}条`));
  
  console.log('\n❌ 不可用数据源:');
  failed.forEach(r => console.log(`   ${r.name} - ${r.error}`));
  
  console.log(`\n📈 成功率: ${success.length}/${results.length} (${Math.round(success.length/results.length*100)}%)`);
}

main().catch(console.error);
