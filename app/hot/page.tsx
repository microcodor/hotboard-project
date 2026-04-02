/**
 * 榜中榜页面
 * 展示全网最热热点 TOP 100，支持时间范围筛选
 */

'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Flame, Calendar, RefreshCw, Download, TrendingUp } from 'lucide-react'
import ItemCard from '@/components/cards/ItemCard'
import { HotBoardLogo } from '@/components/layout'
import { ShareButton, TrendChart } from '@/components/hot'
import { useInfiniteScroll, preloadImages } from '@/lib/performance'
import { cn } from '@/lib/utils'

// 动态导入图表组件（客户端）
const TrendChartDynamic = dynamic(
  () => import('@/components/hot/TrendChart'),
  { ssr: false, loading: () => <div className="h-48 bg-gray-100 animate-pulse rounded-lg" /> }
)

// 时间范围选项（key = API接受的 range 值，label = 显示名称）
const TIME_RANGES = [
  { key: 'day',   label: '今日', apiKey: 'day' },
  { key: 'week',  label: '本周', apiKey: 'week' },
  { key: 'month', label: '本月', apiKey: 'month' },
]

// 热点项类型
interface HotItem {
  title: string
  description?: string
  url: string
  thumbnail?: string
  node_name?: string
  node_hashid?: string
  score?: number
  trend?: number[]
}

// API 响应类型
interface HotRankResponse {
  success: boolean
  data?: {
    items: HotItem[]
    total: number
    timeRange: string
  }
  error?: string
}

// 页面内容组件
function HotPageContent() {
  const searchParams = useSearchParams()
  const rawRange = searchParams.get('range') || 'day'
  const initialRange = rawRange === 'today' ? 'day' : rawRange === 'year' ? 'month' : rawRange

  // 状态
  const [items, setItems] = useState<HotItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState(initialRange)
  const [showChart, setShowChart] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // 加载数据
  const loadData = useCallback(async (range: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // 兼容旧参数：today→day, year→month
      const apiRange = range === 'today' ? 'day' : range === 'year' ? 'month' : range
      const response = await fetch(`/api/hot?range=${apiRange}&limit=100`, { credentials: 'include' })
      const data: HotRankResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || '加载失败')
      }

      if (data.data) {
        setItems(data.data.items)
        
        // 预加载图片
        const thumbnails = data.data.items
          .filter(item => item.thumbnail)
          .map(item => item.thumbnail!)
        if (thumbnails.length > 0) {
          preloadImages(thumbnails.slice(0, 10))
        }
      }

      setLastUpdate(new Date())
    } catch (err: any) {
      setError(err.message || '加载失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 初始加载
  useEffect(() => {
    loadData(timeRange)
  }, [timeRange, loadData])

  // 无限滚动
  const { observerRef, isLoading: isLoadingMore } = useInfiniteScroll(
    () => {
      // 可以实现分页加载更多
    },
    false,
    200
  )

  // 时间范围变更
  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range)
    setItems([])
  }

  // 刷新数据
  const handleRefresh = () => {
    loadData(timeRange)
  }

  // 导出数据
  const handleExport = () => {
    const csvContent = [
      ['排名', '标题', '来源', '链接'].join(','),
      ...items.map((item, index) => [
        index + 1,
        `"${item.title.replace(/"/g, '""')}"`,
        item.node_name || '',
        item.url,
      ].join(',')),
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `hotboard-${timeRange}-${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 生成热度趋势数据（模拟）
  const trendData = items.slice(0, 10).map((_, i) => Math.floor(Math.random() * 1000) + 500)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Flame className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">榜中榜</h1>
                <p className="mt-1 text-orange-100">全网最热热点聚合 · TOP 100</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <ShareButton 
                title="HotBoard 榜中榜 - 全网最热热点" 
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm"
              />
              {lastUpdate && (
                <span className="text-xs text-orange-100">
                  更新时间: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 控制栏 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* 时间范围选择 */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {TIME_RANGES.map((range) => (
                  <button
                    key={range.key}
                    onClick={() => handleTimeRangeChange(range.key)}
                    className={cn(
                      'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                      timeRange === range.key
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    )}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowChart(!showChart)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  showChart 
                    ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                <TrendingUp className="w-4 h-4" />
                热度趋势
              </button>
              
              <button
                onClick={handleExport}
                disabled={items.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
              
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
                刷新
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* 错误状态 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* 热度趋势图表 */}
        {showChart && items.length > 0 && (
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              热度趋势 TOP 10
            </h3>
            <TrendChartDynamic data={trendData} />
          </div>
        )}

        {/* 加载状态 */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : items.length > 0 ? (
          <>
            {/* 统计信息 */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-gray-500">
                共 <span className="font-medium text-gray-900 dark:text-white">{items.length}</span> 个热点
              </div>
              <div className="text-sm text-gray-500">
                数据来源: 全网热门榜单聚合
              </div>
            </div>

            {/* 热点列表 */}
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={`${item.url}-${index}`}
                  className="relative"
                >
                  <ItemCard
                    item={item}
                    rank={index + 1}
                    showRank
                    showThumbnail={false}
                    className={cn(
                      index < 3 && 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10'
                    )}
                  />
                  
                  {/* TOP 3 徽章 */}
                  {index < 3 && (
                    <div className={cn(
                      'absolute -left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg',
                      index === 0 && 'bg-gradient-to-br from-yellow-400 to-yellow-600',
                      index === 1 && 'bg-gradient-to-br from-gray-300 to-gray-500',
                      index === 2 && 'bg-gradient-to-br from-amber-600 to-amber-800'
                    )}>
                      {index + 1}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 无限滚动触发器 */}
            <div ref={observerRef} className="py-8 text-center">
              {isLoadingMore && (
                <div className="flex items-center justify-center gap-3 text-gray-500">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>加载更多...</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Flame className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">暂无热点数据</p>
            <p className="text-gray-400 text-sm mt-2">请稍后刷新页面</p>
          </div>
        )}
      </div>
    </div>
  )
}

// 榜中榜页面
export default function HotPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      }
    >
      <HotPageContent />
    </Suspense>
  )
}
