/**
 * 简化版性能监控工具
 * - 基础性能指标采集
 * - 内存使用监控
 * - API 响应时间追踪
 * - 简洁的性能报告生成
 */

// 性能指标接口
export interface SimplePerformanceMetrics {
  // 页面加载性能
  pageLoadTime: number
  domContentLoaded: number
  firstPaint: number
  firstContentfulPaint: number

  // 资源加载
  resourceCount: number
  totalResourceSize: number
  slowResources: Array<{ name: string; duration: number }>

  // 内存使用
  usedJSHeapSize?: number
  totalJSHeapSize?: number
  jsHeapSizeLimit?: number

  // API 性能
  apiCalls: Array<{ endpoint: string; duration: number; status: 'success' | 'error' }>

  // 元数据
  timestamp: number
  url: string
  userAgent: string
}

// 性能阈值
export const PERF_THRESHOLDS = {
  pageLoad: { good: 3000, poor: 6000 },
  firstPaint: { good: 1000, poor: 2000 },
  firstContentfulPaint: { good: 1800, poor: 3000 },
  apiLatency: { good: 500, poor: 2000 },
  resourceSize: { good: 1024 * 1024, poor: 3 * 1024 * 1024 }, // 1MB, 3MB
}

/**
 * 简化版性能监控器
 */
export class PerfMonitor {
  private static instance: PerfMonitor
  private metrics: Partial<SimplePerformanceMetrics> = {}
  private apiCalls: Array<{ endpoint: string; duration: number; status: 'success' | 'error' }> = []

  private constructor() {
    this.metrics = {
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      apiCalls: [],
    }
  }

  static getInstance(): PerfMonitor {
    if (!PerfMonitor.instance) {
      PerfMonitor.instance = new PerfMonitor()
    }
    return PerfMonitor.instance
  }

  /**
   * 收集页面性能指标
   */
  collectPageMetrics(): void {
    if (typeof window === 'undefined' || !performance) return

    const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (!navTiming) return

    // 页面加载时间
    this.metrics.pageLoadTime = navTiming.loadEventEnd - navTiming.fetchStart
    this.metrics.domContentLoaded = navTiming.domContentLoadedEventEnd - navTiming.fetchStart

    // 绘制时间
    const paintEntries = performance.getEntriesByType('paint')
    for (const entry of paintEntries) {
      if (entry.name === 'first-paint') {
        this.metrics.firstPaint = entry.startTime
      } else if (entry.name === 'first-contentful-paint') {
        this.metrics.firstContentfulPaint = entry.startTime
      }
    }

    // 内存使用 (仅 Chrome 支持)
    if ('memory' in performance) {
      const memory = (performance as any).memory
      this.metrics.usedJSHeapSize = memory.usedJSHeapSize
      this.metrics.totalJSHeapSize = memory.totalJSHeapSize
      this.metrics.jsHeapSizeLimit = memory.jsHeapSizeLimit
    }
  }

  /**
   * 收集资源加载信息
   */
  collectResourceMetrics(): void {
    if (typeof window === 'undefined' || !performance) return

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    
    this.metrics.resourceCount = resources.length
    this.metrics.totalResourceSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
    
    // 找出慢资源 (>500ms)
    this.metrics.slowResources = resources
      .filter(r => r.duration > 500)
      .map(r => ({ name: r.name, duration: r.duration }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
  }

  /**
   * 记录 API 调用
   */
  recordApiCall(endpoint: string, duration: number, status: 'success' | 'error'): void {
    this.apiCalls.push({ endpoint, duration, status })
    this.metrics.apiCalls = [...this.apiCalls]
  }

  /**
   * 测量函数执行时间
   */
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    try {
      const result = await fn()
      const duration = performance.now() - start
      this.recordApiCall(name, duration, 'success')
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.recordApiCall(name, duration, 'error')
      throw error
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics(): SimplePerformanceMetrics {
    this.collectPageMetrics()
    this.collectResourceMetrics()
    
    return {
      pageLoadTime: this.metrics.pageLoadTime || 0,
      domContentLoaded: this.metrics.domContentLoaded || 0,
      firstPaint: this.metrics.firstPaint || 0,
      firstContentfulPaint: this.metrics.firstContentfulPaint || 0,
      resourceCount: this.metrics.resourceCount || 0,
      totalResourceSize: this.metrics.totalResourceSize || 0,
      slowResources: this.metrics.slowResources || [],
      usedJSHeapSize: this.metrics.usedJSHeapSize,
      totalJSHeapSize: this.metrics.totalJSHeapSize,
      jsHeapSizeLimit: this.metrics.jsHeapSizeLimit,
      apiCalls: this.apiCalls,
      timestamp: Date.now(),
      url: this.metrics.url || '',
      userAgent: this.metrics.userAgent || '',
    }
  }

  /**
   * 获取性能评分
   */
  getScore(): { score: number; rating: 'good' | 'needs-improvement' | 'poor'; issues: string[] } {
    const metrics = this.getMetrics()
    const issues: string[] = []
    let totalScore = 100

    // 页面加载评分
    if (metrics.pageLoadTime > PERF_THRESHOLDS.pageLoad.poor) {
      issues.push(`页面加载时间过长 (${(metrics.pageLoadTime / 1000).toFixed(2)}s)`)
      totalScore -= 25
    } else if (metrics.pageLoadTime > PERF_THRESHOLDS.pageLoad.good) {
      issues.push(`页面加载时间需优化 (${(metrics.pageLoadTime / 1000).toFixed(2)}s)`)
      totalScore -= 10
    }

    // FCP 评分
    if (metrics.firstContentfulPaint > PERF_THRESHOLDS.firstContentfulPaint.poor) {
      issues.push(`首次内容绘制时间过长 (${metrics.firstContentfulPaint.toFixed(0)}ms)`)
      totalScore -= 20
    } else if (metrics.firstContentfulPaint > PERF_THRESHOLDS.firstContentfulPaint.good) {
      issues.push(`首次内容绘制时间需优化 (${metrics.firstContentfulPaint.toFixed(0)}ms)`)
      totalScore -= 10
    }

    // 资源大小评分
    if (metrics.totalResourceSize > PERF_THRESHOLDS.resourceSize.poor) {
      issues.push(`资源总大小过大 (${(metrics.totalResourceSize / 1024 / 1024).toFixed(2)}MB)`)
      totalScore -= 15
    }

    // 慢资源评分
    if (metrics.slowResources.length > 3) {
      issues.push(`存在 ${metrics.slowResources.length} 个加载缓慢的资源`)
      totalScore -= 10
    }

    // API 响应评分
    const slowApis = metrics.apiCalls.filter(a => a.duration > PERF_THRESHOLDS.apiLatency.poor)
    if (slowApis.length > 0) {
      issues.push(`${slowApis.length} 个 API 调用响应过慢`)
      totalScore -= 15
    }

    const score = Math.max(0, totalScore)
    const rating = score >= 80 ? 'good' : score >= 50 ? 'needs-improvement' : 'poor'

    return { score, rating, issues }
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const metrics = this.getMetrics()
    const { score, rating, issues } = this.getScore()

    const report = [
      '📊 性能监控报告',
      '================',
      '',
      `总体评分: ${score}/100 (${rating})`,
      '',
      '⏱️ 页面性能:',
      `  - 页面加载时间: ${(metrics.pageLoadTime / 1000).toFixed(2)}s`,
      `  - DOM 内容加载: ${(metrics.domContentLoaded / 1000).toFixed(2)}s`,
      `  - 首次绘制: ${metrics.firstPaint.toFixed(0)}ms`,
      `  - 首次内容绘制: ${metrics.firstContentfulPaint.toFixed(0)}ms`,
      '',
      '📦 资源统计:',
      `  - 资源数量: ${metrics.resourceCount}`,
      `  - 总大小: ${(metrics.totalResourceSize / 1024 / 1024).toFixed(2)}MB`,
      '',
    ]

    if (metrics.slowResources.length > 0) {
      report.push('🐌 慢资源 (前5个):')
      metrics.slowResources.slice(0, 5).forEach((r, i) => {
        report.push(`  ${i + 1}. ${r.name.substring(0, 50)}... (${r.duration.toFixed(0)}ms)`)
      })
      report.push('')
    }

    if (metrics.usedJSHeapSize) {
      report.push('💾 内存使用:')
      report.push(`  - 已用: ${(metrics.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`)
      report.push(`  - 总量: ${(metrics.totalJSHeapSize! / 1024 / 1024).toFixed(2)}MB`)
      report.push(`  - 限制: ${(metrics.jsHeapSizeLimit! / 1024 / 1024).toFixed(2)}MB`)
      report.push('')
    }

    if (metrics.apiCalls.length > 0) {
      report.push('🔌 API 调用:')
      const successRate = (metrics.apiCalls.filter(a => a.status === 'success').length / metrics.apiCalls.length * 100).toFixed(1)
      const avgLatency = metrics.apiCalls.reduce((sum, a) => sum + a.duration, 0) / metrics.apiCalls.length
      report.push(`  - 调用次数: ${metrics.apiCalls.length}`)
      report.push(`  - 成功率: ${successRate}%`)
      report.push(`  - 平均延迟: ${avgLatency.toFixed(0)}ms`)
      report.push('')
    }

    if (issues.length > 0) {
      report.push('⚠️ 性能问题:')
      issues.forEach((issue, i) => {
        report.push(`  ${i + 1}. ${issue}`)
      })
      report.push('')
    } else {
      report.push('✅ 未发现明显性能问题')
    }

    return report.join('\n')
  }

  /**
   * 打印报告到控制台
   */
  printReport(): void {
    console.log(this.generateReport())
  }

  /**
   * 清空记录
   */
  clear(): void {
    this.apiCalls = []
    this.metrics = {
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      apiCalls: [],
    }
  }
}

// 导出单例
export const perfMonitor = PerfMonitor.getInstance()

// 导出便捷方法
export const collectPageMetrics = () => perfMonitor.collectPageMetrics()
export const collectResourceMetrics = () => perfMonitor.collectResourceMetrics()
export const recordApiCall = (endpoint: string, duration: number, status: 'success' | 'error') =>
  perfMonitor.recordApiCall(endpoint, duration, status)
export const measurePerformance = <T>(name: string, fn: () => Promise<T>) => perfMonitor.measure(name, fn)
export const getPerformanceMetrics = () => perfMonitor.getMetrics()
export const getPerformanceScore = () => perfMonitor.getScore()
export const generatePerformanceReport = () => perfMonitor.generateReport()
