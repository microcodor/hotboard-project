/**
 * 外部 API 调用封装
 * 主要用于调用榜眼数据 API
 */

const TOPHUB_API_BASE = 'https://api.tophubdata.com'
const TOPHUB_API_KEY = process.env.TOPHUB_API_KEY

interface FetchOptions {
  cache?: RequestCache
  revalidate?: number
}

/**
 * 通用请求函数
 */
async function fetchAPI<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const url = `${TOPHUB_API_BASE}${endpoint}`
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  if (TOPHUB_API_KEY) {
    headers['Authorization'] = TOPHUB_API_KEY
  }
  
  const response = await fetch(url, {
    headers,
    cache: options.cache || 'no-store',
    ...options,
  })
  
  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * 获取所有榜单列表
 */
export async function fetchNodes(page = 1, pageSize = 100) {
  return fetchAPI<{
    data: any[]
    total: number
    page: number
    page_size: number
  }>(`/nodes?page=${page}&page_size=${pageSize}`)
}

/**
 * 获取榜单详情
 */
export async function fetchNodeDetail(hashid: string) {
  return fetchAPI<{
    data: {
      hashid: string
      name: string
      display?: string
      logo?: string
      cid: number
      items: Array<{
        title: string
        description?: string
        url: string
        thumbnail?: string
        extra?: Record<string, any>
      }>
    }
  }>(`/nodes/${hashid}`)
}

/**
 * 搜索热点
 */
export async function searchHotspots(query: string, hashid?: string) {
  const params = new URLSearchParams({ q: query })
  if (hashid) params.append('hashid', hashid)
  
  return fetchAPI<{
    items: Array<{
      title: string
      description?: string
      url: string
      thumbnail?: string
      node_name?: string
      node_hashid?: string
    }>
    total: number
  }>(`/search?${params.toString()}`)
}

/**
 * 获取榜中榜（最热热点）
 */
export async function fetchHotRank(limit = 50) {
  return fetchAPI<{
    items: Array<{
      title: string
      description?: string
      url: string
      thumbnail?: string
      score: number
      sources: string[]
    }>
  }>(`/hot?limit=${limit}`)
}

/**
 * 获取分类列表
 */
export async function fetchCategories() {
  return fetchAPI<{
    data: Array<{
      id: number
      name: string
      sort_order: number
    }>
  }>('/categories')
}

/**
 * 获取指定分类下的榜单
 */
export async function fetchNodesByCategory(cid: number) {
  return fetchAPI<{
    data: any[]
  }>(`/nodes?cid=${cid}`)
}

/**
 * 同步所有榜单数据
 * 用于定时任务
 */
export async function syncAllNodesData() {
  const nodes = await fetchNodes()
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  }
  
  for (const node of nodes.data || []) {
    try {
      const detail = await fetchNodeDetail(node.hashid)
      // 这里可以保存到数据库
      results.success++
      
      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error: any) {
      results.failed++
      results.errors.push(`${node.hashid}: ${error.message}`)
    }
  }
  
  return results
}
