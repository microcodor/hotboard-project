#!/usr/bin/env node
/**
 * HotBoard Cron 任务管理脚本
 * 用法：
 *   node scripts/manage-cron.js status
 *   node scripts/manage-cron.js update --expr "0 8 * * *" --tz "Asia/Shanghai"
 *   node scripts/manage-cron.js enable
 *   node scripts/manage-cron.js disable
 */

const fs = require('fs')
const path = require('path')

const CRAWL_JOB_ID = '4671d5f7-de56-4d8e-94a7-7e3e434deb3e'

// 读取当前配置
function readConfig() {
  const configPath = path.join(__dirname, '../.cron-config.json')
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'))
  }
  return {
    jobId: CRAWL_JOB_ID,
    enabled: true,
    schedule: {
      kind: 'cron',
      expr: '0 * * * *',
      tz: 'Asia/Shanghai',
      staggerMs: 300000,
    },
  }
}

// 保存配置
function saveConfig(config) {
  const configPath = path.join(__dirname, '../.cron-config.json')
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8')
  console.log('✅ 配置已保存到 .cron-config.json')
}

// 命令处理
const cmd = process.argv[2]
const args = process.argv.slice(3)

switch (cmd) {
  case 'status': {
    const config = readConfig()
    console.log('📊 当前 Cron 配置：')
    console.log(`  Job ID: ${config.jobId}`)
    console.log(`  状态: ${config.enabled ? '✅ 已启用' : '❌ 已禁用'}`)
    console.log(`  Cron 表达式: ${config.schedule.expr}`)
    console.log(`  时区: ${config.schedule.tz}`)
    console.log(`  Stagger: ${config.schedule.staggerMs}ms`)
    break
  }

  case 'update': {
    const config = readConfig()
    let updated = false

    // 解析参数
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--expr' && args[i + 1]) {
        config.schedule.expr = args[i + 1]
        updated = true
        i++
      } else if (args[i] === '--tz' && args[i + 1]) {
        config.schedule.tz = args[i + 1]
        updated = true
        i++
      }
    }

    if (updated) {
      saveConfig(config)
      console.log('📝 更新内容：')
      console.log(`  Cron 表达式: ${config.schedule.expr}`)
      console.log(`  时区: ${config.schedule.tz}`)
      console.log('\n⚠️  请重启 OpenClaw Gateway 使配置生效')
    } else {
      console.log('❌ 未指定任何参数')
    }
    break
  }

  case 'enable': {
    const config = readConfig()
    config.enabled = true
    saveConfig(config)
    console.log('✅ Cron 任务已启用')
    console.log('⚠️  请重启 OpenClaw Gateway 使配置生效')
    break
  }

  case 'disable': {
    const config = readConfig()
    config.enabled = false
    saveConfig(config)
    console.log('❌ Cron 任务已禁用')
    console.log('⚠️  请重启 OpenClaw Gateway 使配置生效')
    break
  }

  default:
    console.log(`
HotBoard Cron 任务管理

用法：
  node scripts/manage-cron.js <command> [options]

命令：
  status                              查看当前配置
  update --expr "0 8 * * *" --tz "Asia/Shanghai"
                                      更新 Cron 表达式和时区
  enable                              启用定时任务
  disable                             禁用定时任务

示例：
  node scripts/manage-cron.js status
  node scripts/manage-cron.js update --expr "0 8 * * *"
  node scripts/manage-cron.js update --tz "UTC"
  node scripts/manage-cron.js enable

Cron 表达式格式：分 时 日 月 周（0-6，0=周日）
  0 * * * *     每小时整点
  0 8 * * *     每天 8 点
  0 9 * * 1     每周一 9 点
  0 0 1 * *     每月 1 号 0 点
`)
}
