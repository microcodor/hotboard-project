/**
 * 防抖 Hook
 */

import { useCallback, useRef, useEffect, useState } from 'react'

/**
 * 防抖回调 Hook
 * 返回一个防抖版本的回调函数
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)

  // 更新 callback ref
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // 清理
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    }) as T,
    [delay]
  )
}

/**
 * 防抖值 Hook
 * 返回一个延迟更新后的值
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timeout)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * 立即执行 + 防抖 Hook
 * 立即执行一次，然后防抖
 */
export function useDebouncedImmediate<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  immediate: boolean = true
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)
  const isFirstRender = useRef(true)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback(
    ((...args: Parameters<T>) => {
      // 立即执行
      if (immediate && isFirstRender.current) {
        callbackRef.current(...args)
        isFirstRender.current = false
        return
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    }) as T,
    [delay, immediate]
  )
}
