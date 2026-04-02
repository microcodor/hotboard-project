/**
 * TopHub 数据抓取测试脚本
 * 测试各个网站的数据抓取能力
 */

const https = require('https');
const http = require('http');

// API 配置
const TOPHUB_API_KEY = process.env.TOPHUB_API_KEY || 'your-api-key-here';
const TOPHUB_BASE_URL = 'https://api.tophub.life';

// 测试的榜单列表
const TEST_NODES = [
  { hashid: 'zhihu-hot', name: '知乎热榜' },
  { hashid: 'weibo-hot', name: '微博热搜' },
  { hashid: 'baidu-hot', name: '百度热搜' },
  { hashid: 'douyin-hot', name: '抖音热点' },
  { hashid: 'bilibili-hot', name: 'B站热门' },
  { hashid: 'toutiao-hot', name: '今日头条' },
  { hashid: 'zhihu-daily', name: '知乎日报' },
  { hashid: 'thepaper-hot', name: '澎湃新闻' },
  { hashid: 'sina-news', name: '新浪新闻' },
  { hashid: 'netease-news', name: '网易新闻' },
];

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// 辅助函数
function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': TOPHUB_API_KEY,
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// 测试函数
async function testNode(hashid, name) {
  try {
    const startTime = Date.now();
    const response = await makeRequest(`${TOPHUB_BASE_URL}/v2/GetNodeInfo/${hashid}`);
    const duration = Date.now() - startTime;
    
    if (response.status === 200 && response.data.code === 0) {
      const nodeData = response.data.data;
      const itemCount = nodeData.list ? nodeData.list.length : 0;
      
      log('green', `✓ ${name.padEnd(15)} | 状态: 200 | 条目: ${itemCount} | 耗时: ${duration}ms`);
      
      // 显示前3条数据
      if (nodeData.list && nodeData.list.length > 0) {
        nodeData.list.slice(0, 3).forEach((item, index) => {
          log('cyan', `  ${index + 1}. ${item.title.substring(0, 40)}${item.title.length > 40 ? '...' : ''} | 热度: ${item.hot_value || 'N/A'}`);
        });
      }
      
      return {
        success: true,
        name,
        hashid,
        itemCount,
        duration,
      };
    } else {
      log('red', `✗ ${name.padEnd(15)} | 状态: ${response.status} | 错误: ${response.data.message || 'Unknown error'}`);
      return {
        success: false,
        name,
        hashid,
        error: response.data.message || 'Unknown error',
      };
    }
  } catch (error) {
    log('red', `✗ ${name.padEnd(15)} | 错误: ${error.message}`);
    return {
      success: false,
      name,
      hashid,
      error: error.message,
    };
  }
}

// 主测试函数
async function main() {
  log('blue', '='.repeat(80));
  log('blue', 'HotBoard 数据抓取能力测试');
  log('blue', '='.repeat(80));
  log('yellow', `\n测试时间: ${new Date().toLocaleString('zh-CN')}`);
  log('yellow', `API 地址: ${TOPHUB_BASE_URL}`);
  log('yellow', `测试榜单: ${TEST_NODES.length} 个\n`);
  
  log('blue', '-'.repeat(80));
  log('blue', '开始测试...');
  log('blue', '-'.repeat(80) + '\n');
  
  const results = [];
  
  for (const node of TEST_NODES) {
    const result = await testNode(node.hashid, node.name);
    results.push(result);
    console.log(''); // 空行分隔
  }
  
  // 统计结果
  log('blue', '-'.repeat(80));
  log('blue', '测试结果统计');
  log('blue', '-'.repeat(80) + '\n');
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const totalItems = results.filter(r => r.success).reduce((sum, r) => sum + r.itemCount, 0);
  const avgDuration = results.filter(r => r.success).reduce((sum, r) => sum + r.duration, 0) / successCount || 0;
  
  log('green', `✓ 成功: ${successCount}/${TEST_NODES.length}`);
  log('red', `✗ 失败: ${failCount}/${TEST_NODES.length}`);
  log('cyan', `总条目数: ${totalItems}`);
  log('yellow', `平均耗时: ${avgDuration.toFixed(0)}ms`);
  
  // 成功率
  const successRate = (successCount / TEST_NODES.length * 100).toFixed(1);
  log('blue', `\n成功率: ${successRate}%`);
  
  // 失败列表
  if (failCount > 0) {
    log('red', '\n失败的榜单:');
    results.filter(r => !r.success).forEach(r => {
      log('red', `  - ${r.name}: ${r.error}`);
    });
  }
  
  log('blue', '\n' + '='.repeat(80));
  log('green', '测试完成！');
  log('blue', '='.repeat(80));
  
  // 返回测试结果
  return {
    total: TEST_NODES.length,
    success: successCount,
    failed: failCount,
    totalItems,
    avgDuration,
    successRate,
    results,
  };
}

// 运行测试
main().catch(error => {
  log('red', `\n测试失败: ${error.message}`);
  process.exit(1);
});
