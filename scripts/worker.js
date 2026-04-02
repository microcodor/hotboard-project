/**
 * HotBoard 独立抓取调度器 v4
 * 
 * 支持多个定时配置
 */

const cron = require('node-cron')
const http = require('http')
const fs = require('fs')
const path = require('path')

// ============================================================
// 配置
// ============================================================

const CONFIG = {
  port: parseInt(process.env.WORKER_PORT || '3001'),
  hotboardUrl: process.env.HOTBOARD_URL || 'http://localhost:3000',
  isRunning: false,
  lastResult: null,
  taskStatus: 'idle',
  schedules: [],
  cronJobs: [],
}

// ============================================================
// 日志
// ============================================================

function log(...args) {
  const ts = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
  console.log(`[${ts}] ${args.join(' ')}`)
}

// ============================================================
// 配置管理
// ============================================================

const CONFIG_FILE = path.join(process.cwd(), '.schedule-config.json')

function loadSchedules() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
      return config.schedules || []
    }
  } catch {}
  return []
}

function setupCronJobs() {
  // 清理旧的定时任务
  CONFIG.cronJobs.forEach(job => job.stop())
  CONFIG.cronJobs = []

  const schedules = loadSchedules()
  CONFIG.schedules = schedules.filter(s => s.enabled)

  schedules.filter(s => s.enabled).forEach(schedule => {
    try {
      if (cron.validate(schedule.expr)) {
        const job = cron.schedule(schedule.expr, async () => {
          log(`⏰ 定时任务触发: ${schedule.label || schedule.expr}`)
          await runCrawlTasks('scheduled')
        }, {
          timezone: schedule.tz || 'Asia/Shanghai',
          scheduled: true,
        })
        CONFIG.cronJobs.push(job)
        log(`✅ 定时任务已注册: ${schedule.expr} (${schedule.label || schedule.tz})`)
      } else {
        log(`⚠️  无效的 Cron 表达式: ${schedule.expr}`)
      }
    } catch (e) {
      log(`❌ 定时任务注册失败: ${schedule.expr} - ${e.message}`)
    }
  })

  if (CONFIG.cronJobs.length === 0) {
    log('⚠️  没有有效的定时任务')
  } else {
    log(`📅 共注册 ${CONFIG.cronJobs.length} 个定时任务`)
  }
}

// ============================================================
// 内置抓取
// ============================================================

async function runBuiltinCrawl() {
  try {
    const { crawlAll } = require('./crawl-builtin.js')
    log('使用内置抓取模块...')
    return await crawlAll()
  } catch (e) {
    log(`⚠️  内置模块加载失败: ${e.message}`)
    return []
  }
}

// ============================================================
// 抓取任务
// ============================================================

async function runCrawlTasks(source = 'scheduled') {
  if (CONFIG.isRunning) {
    log('⚠️  抓取任务正在执行中，跳过')
    return { success: false, error: '任务正在执行中' }
  }

  CONFIG.isRunning = true
  CONFIG.taskStatus = 'running'
  const startTime = Date.now()

  log('')
  log('═'.repeat(60))
  log(`🚀 HotBoard 抓取任务开始 (${source})`)
  log(`⏰ 执行时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`)
  log('═'.repeat(60))

  try {
    const builtinResults = await runBuiltinCrawl()
    
    if (builtinResults && builtinResults.length > 0) {
      const totalItems = builtinResults.reduce((sum, r) => sum + (r.count || 0), 0)
      const successCount = builtinResults.filter(r => r.success).length
      
      log('\n📊 抓取结果汇总')
      builtinResults.forEach(r => {
        const icon = r.success ? '✅' : '❌'
        const info = r.success ? `${r.count}条` : (r.error || '失败')
        log(`  ${icon} ${r.name}: ${info}`)
      })
      
      CONFIG.lastResult = {
        startTime,
        endTime: Date.now(),
        duration: ((Date.now() - startTime) / 1000).toFixed(1),
        totalSuccess: successCount,
        totalFailed: builtinResults.length - successCount,
        totalItems,
        results: builtinResults,
        source,
      }
      
      CONFIG.taskStatus = successCount > 0 ? 'success' : 'failed'
    } else {
      log('⚠️  没有抓取结果')
      CONFIG.taskStatus = 'failed'
    }

  } catch (error) {
    log(`❌ 抓取出错: ${error.message}`)
    CONFIG.taskStatus = 'failed'
    CONFIG.lastResult = { error: error.message, startTime }
  }

  log('')
  log('═'.repeat(60))
  log(`🏁 任务结束，耗时 ${CONFIG.lastResult?.duration || 0}s`)
  log('═'.repeat(60))

  CONFIG.isRunning = false
  return CONFIG.lastResult
}

// ============================================================
// HTTP API
// ============================================================

function createApiServer() {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const url = new URL(req.url, `http://localhost:${CONFIG.port}`)

    // GET /status
    if (url.pathname === '/status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        success: true,
        data: {
          status: CONFIG.taskStatus,
          isRunning: CONFIG.isRunning,
          lastResult: CONFIG.lastResult,
          schedules: CONFIG.schedules,
          cronJobCount: CONFIG.cronJobs.length,
          uptime: Math.round(process.uptime()),
        },
      }))
      return
    }

    // POST /trigger
    if (url.pathname === '/trigger' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', async () => {
        if (CONFIG.isRunning) {
          res.writeHead(409, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, error: '任务正在执行中' }))
          return
        }

        log('📡 收到手动触发请求')
        runCrawlTasks('manual').catch(console.error)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          success: true,
          message: '抓取任务已启动',
          jobId: `manual-${Date.now()}`,
        }))
      })
      return
    }

    // POST /reload - 重新加载定时配置
    if (url.pathname === '/reload' && req.method === 'POST') {
      log('📡 收到重新加载配置请求')
      setupCronJobs()
      
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        success: true,
        message: '配置已重新加载',
        scheduleCount: CONFIG.schedules.length,
      }))
      return
    }

    // GET /logs
    if (url.pathname === '/logs' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        success: true,
        data: { lastResult: CONFIG.lastResult, isRunning: CONFIG.isRunning },
      }))
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: false, error: 'Not Found' }))
  })

  return server
}

// ============================================================
// 主程序
// ============================================================

async function main() {
  console.log('')
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║  HotBoard 独立抓取调度器 v4.0                          ║')
  console.log('║  支持多个定时配置                                      ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log('')

  // 加载并设置定时任务
  setupCronJobs()

  const server = createApiServer()
  server.listen(CONFIG.port, () => {
    log(`✅ Worker API 服务器已启动 (http://localhost:${CONFIG.port})`)
    log('')
    log('📡 可用接口:')
    log('   GET  /status   - 获取状态')
    log('   POST /trigger  - 手动触发抓取')
    log('   POST /reload   - 重新加载定时配置')
    log('   GET  /logs     - 获取最近日志')
    log('')
    log('📅 定时任务已注册，等待执行...')
    log('   按 Ctrl+C 停止调度器')
    log('')
  })

  process.on('SIGINT', () => {
    console.log('\n\n👋 关闭调度器...')
    CONFIG.cronJobs.forEach(job => job.stop())
    server.close()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('\n\n👋 关闭调度器...')
    CONFIG.cronJobs.forEach(job => job.stop())
    server.close()
    process.exit(0)
  })
}

main().catch(error => {
  console.error('❌ 调度器启动失败:', error)
  process.exit(1)
})
