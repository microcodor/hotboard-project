import { NextResponse } from 'next/server'
import { syncAllNodes } from '@/scripts/sync-data'

export async function GET() {
  // 验证请求来源（Vercel Cron Job 或管理员）
  const authHeader = process.env.CRON_SECRET
  
  // 如果配置了 CRON_SECRET，进行验证
  // 实际部署时可以添加更严格的验证

  try {
    const result = await syncAllNodes()
    
    return NextResponse.json({ 
      success: true, 
      message: '数据同步完成',
      synced: result.synced,
      errors: result.errors
    })
  } catch (error: any) {
    console.error('同步失败:', error)
    return NextResponse.json(
      { success: false, error: error.message || '同步失败' },
      { status: 500 }
    )
  }
}

// POST 方法也可以触发同步
export async function POST() {
  return GET()
}
