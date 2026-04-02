/**
 * 性能监控系统
 * - Web Vitals 监控
 * - 自定义性能指标
 * - 性能数据上报
 */

import type { Metric } from 'web-vitals'

// 性能指标类型
export interface PerformanceMetrics {
  // Web Vitals
  LCP?: number // Largest Contentful Paint
  FID?: number // First Input Delay
  CLS?: number // Cumulative Layout Shift
  FCP?: number // First Contentful Paint
  TTFB?: number // Time to First Byte
  INP?: number // Interaction to Next Paint
  
  // 自定义指标
  apiLatency?: number
  cacheHitRate?: number
  errorRate?: number
  pageLoadTime?: number
  memoryUsage?: number
  
  // 元数据
  timestamp: number
  url: string
  userAgent: string
  connectionType?: string
}

// 性能阈值配置
export const PERFORMANCE_THRESHOLDS = {
  LCP: {
    good: 2500,
    needsImprovement: 4000,
    unit: 'ms',
  },
  FID: {
    good: 100,
    needsImprovement: 300,
    unit: 'ms',
  },
  CLS: {
    good: 0.1,
    needsImprovement: 0.25,
    unit: 'score',
  },
  FCP: {
    good: 1800,
    needsImprovement: 3000,
    unit: 'ms',
  },
  TTFB: {
    good: 800,
    needsImprovement: 1800,
    unit: 'ms',
  },
  INP: {
    good: 200,
    needsImprovement: 500,
    unit: 'ms',
  },
} as const

// 性能评分等级
export type PerformanceRating = 'good' | 'needs-improvement' | 'poor'

/**
 * 评估性能指标
 */
export function getMetricRating(
  metricName: keyof typeof PERFORMANCE_THRESHOLDS,
  value: number
): PerformanceRating {
  const threshold = PERFORMANCE_THRESHOLDS[metricName]
  if (!threshold) return 'good'
  
  if (value <= threshold.good) return 'good'
  if (value <= threshold.needsImprovement) return 'needs-improvement'
  return 'poor'
}

/**
 * 性能监控器类
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetrics
  private observers: PerformanceObserver[] = []
  private reportQueue: PerformanceMetrics[] = []
  private isInitialized = false

  private constructor() {
    this.metrics = {
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    }
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * 初始化性能监控
   */
  async init(): Promise<void> {
    if (this.isInitialized || typeof window === 'undefined') return
    
    try {
      // 动态导入 web-vitals
      const { onLCP, onFID, onCLS, onFCP, onTTFB, onINP } = await import('web-vitals')
      
      // 注册 Web Vitals 监听
      onLCP(this.handleMetric('LCP'))
      onFID(this.handleMetric('FID'))
      onCLS(this.handleMetric('CLS'))
      onFCP(this.handleMetric('FCP'))
      onTTFB(this.handleMetric('TTFB'))
      onINP(this.handleMetric('INP'))

      // 监听自定义指标
      this.observeCustomMetrics()
      
      // 监听页面可见性变化
      this.observeVisibilityChange()
      
      this.isInitialized = true
      console.log('[Performance] Monitor initialized')
    } catch (error) {
      console.error('[Performance] Failed to initialize:', error)
    }
  }

  /**
   * 处理 Web Vitals 指标
   */
  private handleMetric(metricName: keyof typeof PERFORMANCE_THRESHOLDS) {
    return (metric: Metric) => {
      const value = metric.value
      this.metrics[metricName] = value
      
      const rating = getMetricRating(metricName, value)
      const threshold = PERFORMANCE_THRESHOLDS[metricName]
      
      console.log(
        `[Performance] ${metricName}: ${value.toFixed(2)}${threshold.unit} (${rating})`
      )
      
      // 如果性能较差，记录详细信息
      if (rating === 'poor') {
        console.warn(`[Performance] Poor ${metricName} detected`, {
          value,
          threshold: threshold.needsImprovement,
          url: this.metrics.url,
        })
      }
      
      // 触发自定义事件
      this.dispatchEvent(metricName, value, rating)
    }
  }

  /**
   * 观察自定义性能指标
   */
  private observeCustomMetrics(): void {
    if (typeof PerformanceObserver === 'undefined') return

    // 监听资源加载
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.name.includes('/api/')) {
            this.recordApiLatency(entry.duration, entry.name)
          }
        })
      })
      resourceObserver.observe({ type: 'resource', buffered: true })
      this.observers.push(resourceObserver)
    } catch (e) {
      console.warn('[Performance] Resource observer not supported')
    }

    // 监听长任务
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          console.warn('[Performance] Long task detected:', {
            duration: entry.duration,
            startTime: entry.startTime,
          })
        })
      })
      longTaskObserver.observe({ type: 'longtask', buffered: true })
      this.observers.push(longTaskObserver)
    } catch (e) {
      console.warn('[Performance] Long task observer not supported')
    }
  }

  /**
   * 监听页面可见性变化
   */
  private observeVisibilityChange(): void {
    if (typeof document === 'undefined') return

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.report()
      }
    })

    // 页面卸载时上报
    window.addEventListener('beforeunload', () => {
      this.report()
    })
  }

  /**
   * 记录 API 延迟
   */
  private recordApiLatency(duration: number, url: string): void {
    const currentLatency = this.metrics.apiLatency || 0
    const count = this.reportQueue.length + 1
    this.metrics.apiLatency = (currentLatency * (count - 1) + duration) / count
  }

  /**
   * 记录自定义指标
   */
  recordCustomMetric(name: string, value: number): void {
    const metricKey = name as keyof PerformanceMetrics
    if (metricKey in this.metrics) {
      this.metrics[metricKey] = value
    }
    console.log(`[Performance] Custom metric ${name}: ${value}`)
  }

  /**
   * 记录缓存命中率
   */
  recordCacheHitRate(hit: boolean): void {
    // 简化的计算方式
    const currentRate = this.metrics.cacheHitRate || 0
    const newRate = hit ? Math.min(currentRate + 0.1, 1) : Math.max(currentRate - 0.1, 0)
    this.metrics.cacheHitRate = newRate
  }

  /**
   * 记录错误率
   */
  recordError(): void {
    const currentRate = this.metrics.errorRate || 0
    this.metrics.errorRate = Math.min(currentRate + 0.01, 1)
  }

  /**
   * 获取内存使用情况
   */
  getMemoryUsage(): number | undefined {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      return memory.usedJSHeapSize / memory.jsHeapSizeLimit
    }
    return undefined
  }

  /**
   * 触发自定义事件
   */
  private dispatchEvent(
    metricName: string,
    value: number,
    rating: PerformanceRating
  ): void {
    if (typeof window === 'undefined') return

    const event = new CustomEvent('performance-metric', {
      detail: { metricName, value, rating },
    })
    window.dispatchEvent(event)
  }

  /**
   * 获取当前指标
   */
  getMetrics(): PerformanceMetrics {
    // 更新时间戳和内存使用
    this.metrics.timestamp = Date.now()
    this.metrics.memoryUsage = this.getMemoryUsage()
    return { ...this.metrics }
  }

  /**
   * 获取性能评分
   */
  getPerformanceScore(): {
    score: number
    rating: PerformanceRating
    details: Record<string, { value: number; rating: PerformanceRating }>
  } {
    const details: Record<string, { value: number; rating: PerformanceRating }> = {}
    let totalScore = 0
    let validMetrics = 0

    const metricNames: (keyof typeof PERFORMANCE_THRESHOLDS)[] = [
      'LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'INP'
    ]

    metricNames.forEach((metricName) => {
      const value = this.metrics[metricName]
      if (value !== undefined) {
        const rating = getMetricRating(metricName, value)
        details[metricName] = { value, rating }
        
        // 计算分数 (good=100, needs-improvement=50, poor=0)
        const score = rating === 'good' ? 100 : rating === 'needs-improvement' ? 50 : 0
        totalScore += score
        validMetrics++
      }
    })

    const avgScore = validMetrics > 0 ? totalScore / validMetrics : 100
    const rating: PerformanceRating = avgScore >= 90 ? 'good' : avgScore >= 50 ? 'needs-improvement' : 'poor'

    return {
      score: Math.round(avgScore),
      rating,
      details,
    }
  }

  /**
   * 上报性能数据
   */
  async report(): Promise<void> {
    const metrics = this.getMetrics()
    const score = this.getPerformanceScore()
    
    const payload = {
      metrics,
      score,
      timestamp: Date.now(),
    }

    try {
      // 发送到服务端
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
        navigator.sendBeacon('/api/metrics', blob)
      } else {
        // 降级使用 fetch
        await fetch('/api/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        })
      }
      
      console.log('[Performance] Metrics reported', score)
    } catch (error) {
      console.error('[Performance] Failed to report metrics:', error)
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.observers.forEach((observer) => observer.disconnect())
    this.observers = []
    this.isInitialized = false
  }
}

// 导出单例
export const performanceMonitor = PerformanceMonitor.getInstance()

/**
 * React Hook: 使用性能监控
 */
export function usePerformanceMonitor() {
  if (typeof window === 'undefined') {
    return null
  }

  return {
    init: () => performanceMonitor.init(),
    getMetrics: () => performanceMonitor.getMetrics(),
    getScore: () => performanceMonitor.getPerformanceScore(),
    recordMetric: (name: string, value: number) => performanceMonitor.recordCustomMetric(name, value),
    recordCacheHit: (hit: boolean) => performanceMonitor.recordCacheHitRate(hit),
    recordError: () => performanceMonitor.recordError(),
    report: () => performanceMonitor.report(),
  }
}
