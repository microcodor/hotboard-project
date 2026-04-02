/**
 * 内部 API 调用 Hook
 * 自动带上 INTERNAL_TOKEN（从环境变量读取）
 */
import { useCallback } from 'react'

export function useInternalApi() {
  const fetchInternal = useCallback(async (path: string, options?: RequestInit) => {
    // Token 从环境变量注入（构建时）
    const token = process.env.NEXT_PUBLIC_INTERNAL_TOKEN || ''
    const url = `/api/internal${path}`

    const res = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        'Authorization': `Bearer ${token}`,
      },
    })

    return res
  }, [])

  return { fetchInternal }
}
