/**
 * HotBoard 定时抓取调度器
 * 每小时自动抓取所有平台数据并同步到数据库
 */

import { execSync } from 'child_process';
import path from 'path';

const PROJECT_DIR = path.resolve(__dirname, '..');
const LOG_FILE = path.join(PROJECT_DIR, 'logs', 'crawler.log');

function log(msg: string) {
  const ts = new Date().toLocaleString('zh-CN');
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try {
    const fs = require('fs');
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch {}
}

async function runCrawl(script: string, label: string) {
  log(`▶ 开始抓取: ${label}`);
  try {
    const output = execSync(`npx tsx ${script}`, {
      cwd: PROJECT_DIR,
      timeout: 120000,
      encoding: 'utf8',
    });
    log(`✅ 完成: ${label}\n${output.trim()}`);
    return true;
  } catch (e: any) {
    log(`❌ 失败: ${label} - ${e.message}`);
    return false;
  }
}

async function runAll() {
  log('🚀 开始全量抓取');
  await runCrawl('scripts/crawl-all.ts', '新平台(微博/知乎/头条/掘金/抖音/少数派/36氪)');
  await runCrawl('scripts/qclaw-crawl-sync.ts', '原有平台(百度/B站/豆瓣/澎湃/HN)');
  log('🏁 全量抓取完成');
}

// 立即执行一次
runAll();

// 每小时执行一次
setInterval(runAll, 60 * 60 * 1000);

log('⏰ 调度器已启动，每小时自动抓取');
