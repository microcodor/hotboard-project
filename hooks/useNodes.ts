/**
 * 榜单相关 Hooks
 */

import useSWR from 'swr'
import { fetchNodeDetail, fetchHotRank } from '@/lib/api'
import { supabase } from '@/lib/supabase'

// 获取榜单列表
export function useNodes(cid?: number) {
  const { data, error, isLoading, mutate } = useSWR(
    cid ? `/api/nodes?cid=${cid}` : '/api/nodes',
    async (url) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error('获取榜单失败')
      return response.json()
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 分钟内不重复请求
    }
  )

  return {
    nodes: data?.data || [],
    isLoading,
    error: error?.message,
    refresh: mutate
  }
}

// 获取榜单详情
export function useNodeDetail(hashid: string) {
  const { data, error, isLoading, mutate } = useSWR(
    hashid ? `/api/nodes/${hashid}` : null,
    async () => {
      const response = await fetch(`/api/nodes/${hashid}`)
      if (!response.ok) throw new Error('获取榜单详情失败')
      return response.json()
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 分钟内不重复请求
    }
  )

  return {
    node: data?.data,
    isLoading,
    error: error?.message,
    refresh: mutate
  }
}

// 获取榜中榜
export function useHotRank() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/hot',
    async () => {
      const response = await fetch('/api/hot')
      if (!response.ok) throw new Error('获取榜中榜失败')
      return response.json()
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  )

  return {
    items: data?.data?.items || [],
    isLoading,
    error: error?.message,
    refresh: mutate
  }
}

// 直接从 Supabase 获取榜单（用于 SSR）
export async function getNodesSSR(cid?: number) {
  const { data, error } = await supabase
    .from('nodes')
    .select('*')
    .eq('status', 'active')
    .order('sort_order', { ascending: true })
  
  if (error) throw error
  return data
}

// 直接从 Supabase 获取榜单详情（用于 SSR）
export async function getNodeDetailSSR(hashid: string) {
  const { data, error } = await supabase
    .from('nodes')
    .select(`
      *,
      items:node_items(
        id,
        title,
        description,
        url,
        thumbnail,
        extra,
        rank,
        created_at
      )
    `)
    .eq('hashid', hashid)
    .single()
  
  if (error) throw error
  return data
}
