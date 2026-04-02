/**
 * 管理后台 - 定时配置 API
 * 
 * 支持多个定时时间点
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'
import fs from 'fs'
import path from 'path'

const CONFIG_FILE = path.join(process.cwd(), '.schedule-config.json')

interface ScheduleEntry {
  id: string
  expr: string        // Cron 表达式
  tz: string          // 时区
  enabled: boolean
  label?: string     // 标签，如"早间"、"午间"
}

interface ScheduleConfig {
  schedules: ScheduleEntry[]
  updatedAt: string
}

function loadConfig(): ScheduleConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
    }
  } catch {}
  return { schedules: [], updatedAt: new Date().toISOString() }
}

function saveConfig(config: ScheduleConfig) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

// 验证 Cron 表达式
function validateCron(expr: string): boolean {
  const parts = expr.trim().split(/\s+/)
  return parts.length === 5
}

// 获取最近的执行时间
function getNextRun(expr: string, tz: string): Date | null {
  // 简化计算：返回下一个整点
  const now = new Date()
  const next = new Date(now)
  next.setMinutes(next.getMinutes() + 1)
  next.setSeconds(0)
  return next
}

export async function GET(request: NextRequest) {
  try {
    verifyAdminToken(request)
    const config = loadConfig()
    
    return NextResponse.json({
      success: true,
      data: {
        schedules: config.schedules,
        nextRunTime: config.schedules.length > 0 ? getNextRun(config.schedules[0].expr, config.schedules[0].tz)?.toISOString() : null,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    verifyAdminToken(request)
    const body = await request.json()
    const { schedules } = body

    if (!Array.isArray(schedules)) {
      return NextResponse.json({ success: false, error: 'schedules 必须是数组' }, { status: 400 })
    }

    // 验证每个表达式
    for (const s of schedules) {
      if (s.expr && !validateCron(s.expr)) {
        return NextResponse.json({ success: false, error: `无效的 Cron 表达式: ${s.expr}` }, { status: 400 })
      }
    }

    const config: ScheduleConfig = {
      schedules,
      updatedAt: new Date().toISOString(),
    }

    saveConfig(config)

    return NextResponse.json({
      success: true,
      message: '定时配置已保存',
      data: config,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}
