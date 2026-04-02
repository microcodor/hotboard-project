/**
 * 搜索相关 Hooks
 */

import useSWR from 'swr'

interface SearchResult {
  title: string
  description?: string
  url: string
  thumbnail?: string
  node_name?: string
  node_hashid?: string
}

export function useSearch(query: string, hashid?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    query ? `/api/search?q=${encodeURIComponent(query)}${hashid ? `&hashid=${hashid}` : ''}` : null,
    async (url) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error('搜索失败')
      return response.json()
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 分钟内不重复请求
    }
  )

  return {
    results: data?.data || [],
    isLoading,
    error: error?.message,
    refresh: mutate
  }
}

// 搜索历史管理
const SEARCH_HISTORY_KEY = 'hotboard_search_history'
const MAX_HISTORY = 10

export function getSearchHistory(): string[] {
  if (typeof window === 'undefined') return []
  
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY)
    return history ? JSON.parse(history) : []
  } catch {
    return []
  }
}

export function addSearchHistory(query: string): void {
  if (typeof window === 'undefined') return
  
  const history = getSearchHistory()
  const filtered = history.filter(item => item !== query)
  const newHistory = [query, ...filtered].slice(0, MAX_HISTORY)
  
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
}

export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SEARCH_HISTORY_KEY)
}
