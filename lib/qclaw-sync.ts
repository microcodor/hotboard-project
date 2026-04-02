/**
 * QClaw 数据同步工具
 * 用于从 QClaw 抓取数据并同步到 HotBoard
 * 
 * 使用方法:
 * 1. 在 QClaw 中抓取数据
 * 2. 调用此脚本同步到 HotBoard
 * 
 * 或者直接调用 HotBoard API:
 * POST http://localhost:3000/api/crawl/import
 */

const HOTBOARD_API = process.env.HOTBOARD_API_URL || 'http://localhost:3000';
const HOTBOARD_API_KEY = process.env.HOTBOARD_API_KEY || '';

/**
 * 同步数据到 HotBoard
 */
export async function syncToHotBoard(
  platform: string,
  items: Array<{
    title: string;
    url: string;
    hot?: number;
    hotText?: string;
    rank: number;
    thumbnail?: string;
    description?: string;
  }>,
  source: string = 'qclaw-crawler'
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(`${HOTBOARD_API}/api/crawl/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(HOTBOARD_API_KEY && { 'X-API-Key': HOTBOARD_API_KEY }),
      },
      body: JSON.stringify({
        platform,
        items,
        source,
        apiKey: HOTBOARD_API_KEY,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      message: result.message,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 批量同步多个平台
 */
export async function syncMultiplePlatforms(
  data: Record<string, Array<any>>
): Promise<Record<string, { success: boolean; message?: string; error?: string }>> {
  const results: Record<string, any> = {};

  for (const [platform, items] of Object.entries(data)) {
    console.log(`[Sync] 同步 ${platform} (${items.length}条)...`);
    results[platform] = await syncToHotBoard(platform, items);
    console.log(`[Sync] ${platform}: ${results[platform].success ? '✅' : '❌'} ${results[platform].message || results[platform].error}`);
  }

  return results;
}

// 示例：如何在 QClaw 中使用
/*
import { syncToHotBoard } from './lib/qclaw-sync';

// 抓取知乎热榜
const zhihuItems = await crawlZhihu();

// 同步到 HotBoard
const result = await syncToHotBoard('zhihu-hot', zhihuItems, 'qclaw-daily-crawl');

if (result.success) {
  console.log('同步成功:', result.message);
}
*/

export default { syncToHotBoard, syncMultiplePlatforms };
