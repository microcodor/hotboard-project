/**
 * 性能优化工具函数
 */

import { useMemo, useRef, useCallback, useEffect, useState } from 'react'

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func.apply(this, args)
    }, wait)
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * 虚拟滚动 Hook
 * 用于大数据列表渲染优化
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 3
) {
  const [scrollTop, setScrollTop] = useState(0)

  const { startIndex, endIndex, visibleItems, offsetY, totalHeight } = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight)
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    )

    return {
      startIndex: Math.max(0, start - overscan),
      endIndex: end,
      visibleItems: items.slice(Math.max(0, start - overscan), end),
      offsetY: Math.max(0, start - overscan) * itemHeight,
      totalHeight: items.length * itemHeight,
    }
  }, [items, itemHeight, containerHeight, scrollTop, overscan])

  const handleScroll = useCallback(
    throttle((e: React.UIEvent<HTMLElement>) => {
      setScrollTop(e.currentTarget.scrollTop)
    }, 16),
    []
  )

  return {
    startIndex,
    endIndex,
    visibleItems,
    offsetY,
    totalHeight,
    handleScroll,
  }
}

/**
 * Intersection Observer Hook
 * 用于懒加载和无限滚动
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)
  const [node, setNode] = useState<Element | null>(null)

  const observer = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (observer.current) {
      observer.current.disconnect()
    }

    observer.current = new IntersectionObserver(
      ([entry]) => setEntry(entry),
      {
        threshold: 0.1,
        rootMargin: '100px',
        ...options,
      }
    )

    if (node) {
      observer.current.observe(node)
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [node, options.threshold, options.rootMargin, options.root])

  return { setRef: setNode, entry, isIntersecting: entry?.isIntersecting ?? false }
}

/**
 * 无限滚动 Hook
 */
export function useInfiniteScroll(
  callback: () => void,
  hasMore: boolean,
  threshold: number = 200
) {
  const observerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          setIsLoading(true)
          await callback()
          setIsLoading(false)
        }
      },
      { rootMargin: `${threshold}px` }
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => observer.disconnect()
  }, [callback, hasMore, isLoading, threshold])

  return { observerRef, isLoading }
}

/**
 * 缓存管理
 */
export const cacheManager = {
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null

    try {
      const item = sessionStorage.getItem(key)
      if (!item) return null

      const { data, expiry } = JSON.parse(item)
      if (expiry && Date.now() > expiry) {
        sessionStorage.removeItem(key)
        return null
      }

      return data as T
    } catch {
      return null
    }
  },

  set<T>(key: string, value: T, ttl: number = 3600000): void {
    if (typeof window === 'undefined') return

    try {
      const item = {
        data: value,
        expiry: ttl ? Date.now() + ttl : null,
      }
      sessionStorage.setItem(key, JSON.stringify(item))
    } catch {
      // Storage full or other error
    }
  },

  remove(key: string): void {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(key)
  },

  clear(): void {
    if (typeof window === 'undefined') return
    sessionStorage.clear()
  },
}

/**
 * 预加载图片
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image()
          img.src = url
          img.onload = () => resolve()
          img.onerror = () => resolve() // 即使失败也 resolve，不阻塞其他图片
        })
    )
  )
}

/**
 * 图片懒加载 Hook
 */
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '')
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const { setRef, isIntersecting } = useIntersectionObserver()

  useEffect(() => {
    if (isIntersecting && src) {
      const img = new Image()
      img.src = src
      img.onload = () => {
        setImageSrc(src)
        setIsLoaded(true)
      }
      img.onerror = () => {
        setIsError(true)
      }
    }
  }, [isIntersecting, src])

  return { imageSrc, isLoaded, isError, setRef }
}

/**
 * 性能监控
 */
export const performanceMonitor = {
  measurePageLoad: () => {
    if (typeof window === 'undefined') return null

    const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (!timing) return null

    return {
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      request: timing.responseStart - timing.requestStart,
      response: timing.responseEnd - timing.responseStart,
      dom: timing.domInteractive - timing.responseEnd,
      load: timing.loadEventStart - timing.loadEventEnd,
      total: timing.loadEventEnd - timing.fetchStart,
    }
  },

  measureApiCall: async (name: string, fn: () => Promise<any>) => {
    const start = performance.now()
    try {
      const result = await fn()
      const duration = performance.now() - start
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`)
      return { result, duration }
    } catch (error) {
      const duration = performance.now() - start
      console.error(`[Performance] ${name} failed: ${duration.toFixed(2)}ms`, error)
      throw error
    }
  },
}
