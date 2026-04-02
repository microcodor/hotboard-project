/**
 * API 类型定义
 */

import type { Node, NodeItem, Category, SearchResultItem, HotRankItem } from './index'

// 获取榜单列表请求
export interface GetNodesRequest {
  cid?: number
  page?: number
  page_size?: number
}

// 获取榜单列表响应
export interface GetNodesResponse {
  data: Node[]
  total: number
}

// 获取榜单详情响应
export interface GetNodeDetailResponse {
  data: Node & {
    items: NodeItem[]
  }
}

// 搜索请求
export interface SearchRequest {
  q: string
  hashid?: string
  page?: number
}

// 搜索响应
export interface SearchResponse {
  items: SearchResultItem[]
  total: number
}

// 获取榜中榜响应
export interface GetHotRankResponse {
  items: HotRankItem[]
}

// 获取分类列表响应
export interface GetCategoriesResponse {
  data: Category[]
}

// 同步数据响应
export interface SyncDataResponse {
  success: boolean
  message: string
  synced: number
  errors: string[]
}
