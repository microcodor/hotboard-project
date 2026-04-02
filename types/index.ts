/**
 * 核心类型定义
 */

// 认证相关类型
export type { UserProfile, AuthState, RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput, ChangePasswordInput, AuthResponse } from './auth';

// 榜单类型
export interface Node {
  id: number | string
  hashid: string
  name: string
  displayName?: string
  display?: string
  logo?: string
  url?: string
  categoryId?: number
  categoryName?: string
  cid: number
  status?: 'active' | 'inactive'
  sort_order?: number
  itemsCount?: number
  items?: NodeItem[]
  created_at?: string
  updatedAt?: string
  updated_at?: string
  createdAt?: string
}

// 榜单项
export interface NodeItem {
  id: number | string
  node_hashid?: string
  title: string
  description?: string
  url: string
  thumbnail?: string
  hotValue?: number
  hotText?: string
  extra?: Record<string, any>
  rank: number
  created_at?: string
}

// 榜单详情（含项目）
export interface NodeDetail extends Node {
  items: NodeItem[]
}

// 分类
export interface Category {
  id: number
  name: string
  sort_order: number
}

// 用户资料
export interface Profile {
  id: string
  email: string
  display_name?: string
  avatar_url?: string
  favorites: string[]
  created_at: string
  updated_at: string
}

// API 响应
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
}

// 搜索结果项
export interface SearchResultItem {
  title: string
  description?: string
  url: string
  thumbnail?: string
  node_name?: string
  node_hashid?: string
}

// 榜中榜项
export interface HotRankItem {
  title: string
  description?: string
  url: string
  thumbnail?: string
  score: number
  sources: string[]
}
