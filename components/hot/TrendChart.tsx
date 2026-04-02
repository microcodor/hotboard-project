/**
 * 热度趋势图表组件
 */

'use client'

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrendChartProps {
  data: number[]
  labels?: string[]
  className?: string
}

export default function TrendChart({ data, labels, className }: TrendChartProps) {
  const { max, min, avg, trend } = useMemo(() => {
    if (data.length === 0) return { max: 0, min: 0, avg: 0, trend: 'stable' }

    const maxVal = Math.max(...data)
    const minVal = Math.min(...data)
    const avgVal = data.reduce((a, b) => a + b, 0) / data.length
    const trendVal = data.length >= 2 ? data[data.length - 1] - data[0] : 0
    const trendType = trendVal > 0 ? 'up' : trendVal < 0 ? 'down' : 'stable'

    return { max: maxVal, min: minVal, avg: avgVal, trend: trendType }
  }, [data])

  const chartBars = useMemo(() => {
    if (data.length === 0 || max === min) return []

    return data.map((value, index) => {
      const height = ((value - min) / (max - min)) * 100
      return {
        value,
        height: Math.max(10, height),
        label: labels?.[index] || `${index + 1}`,
      }
    })
  }, [data, max, min, labels])

  return (
    <div className={cn('space-y-4', className)}>
      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {max.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">最高</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-gray-500">平均</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {min.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">最低</div>
        </div>
      </div>

      {/* 趋势指示器 */}
      <div className="flex items-center justify-center gap-2">
        {trend === 'up' && (
          <>
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-green-600 font-medium">上升趋势</span>
          </>
        )}
        {trend === 'down' && (
          <>
            <TrendingDown className="w-5 h-5 text-red-500" />
            <span className="text-red-600 font-medium">下降趋势</span>
          </>
        )}
        {trend === 'stable' && (
          <>
            <Minus className="w-5 h-5 text-gray-400" />
            <span className="text-gray-500">趋于稳定</span>
          </>
        )}
      </div>

      {/* 图表 */}
      {chartBars.length > 0 && (
        <div className="flex items-end justify-between gap-1 h-20">
          {chartBars.map((bar, index) => (
            <div
              key={index}
              className="flex-1 bg-gradient-to-t from-orange-400 to-red-400 rounded-t transition-all hover:from-orange-500 hover:to-red-500"
              style={{ height: `${bar.height}%` }}
              title={`${bar.label}: ${bar.value.toLocaleString()}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
