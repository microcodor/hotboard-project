'use client'

import { useState, useEffect, useCallback } from 'react'
import { useInternalApi } from '@/hooks/useInternalApi'
import Link from 'next/link'
import NodeCard from '@/components/cards/NodeCard'
import { Header } from '@/components/layout/Header'
import {
  Loader2,
  AlertCircle,
  Search,
  Flame,
  TrendingUp,
  User,
  Heart,
  History,
  ChevronRight,
  Sparkles
} from 'lucide-react'

const APP_CONFIG = {
  name: 'HotBoard',
  description: '全网热榜聚合平台 - 一站式热点追踪服务',
}

interface Category {
  id: number
  name: string
  sort_order: number
}

const NAV_LINKS = [
  { href: '/', label: '首页', icon: TrendingUp },
  { href: '/hot', label: '榜中榜', icon: Flame },
  { href: '/search', label: '搜索', icon: Search },
]

const USER_LINKS = [
  { href: '/user/favorites', label: '我的收藏', icon: Heart },
  { href: '/user/history', label: '浏览历史', icon: History },
  { href: '/user', label: '用户中心', icon: User },
]

const FOOTER_LINKS = [
  { label: '关于我们', href: '/about' },
  { label: 'API 文档', href: '/docs' },
  { label: '隐私政策', href: '/privacy' },
]

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [allNodes, setAllNodes] = useState<any[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  const PAGE_SIZE = 12
  const { fetchInternal } = useInternalApi()

  useEffect(() => {
    fetchInternal('/categories')
      .then(r => r.json())
      .then(d => setCategories(d.data || []))
      .catch(e => setCategoryError(e.message))
      .finally(() => setIsLoadingCategories(false))
  }, [fetchInternal])

  const loadNodes = async (newOffset: number, reset = false) => {
    try {
      if (newOffset === 0) setIsInitialLoading(true)
      else setIsLoadingMore(true)
      setLoadError(null)

      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(newOffset) })
      if (selectedCategory) params.set('cid', selectedCategory)

      const res = await fetchInternal(`/nodes?${params}`)
      if (!res.ok) throw new Error('加载失败')
      const data = await res.json()

      setAllNodes(prev => reset ? (data.data || []) : [...prev, ...(data.data || [])])
      setHasMore(data.hasMore ?? false)
      setOffset(newOffset + (data.data?.length || 0))
    } catch (e: any) {
      setLoadError(e.message)
    } finally {
      setIsInitialLoading(false)
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    setAllNodes([])
    setOffset(0)
    setHasMore(true)
    loadNodes(0, true)
  }, [selectedCategory])

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) loadNodes(offset)
  }

  const handleCategoryChange = (cat: string | null) => {
    setSelectedCategory(cat)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 text-white py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              追踪全网热点
              <span className="block text-yellow-300 text-3xl md:text-5xl mt-2">洞察趋势先机</span>
            </h1>
            <p className="text-blue-100 text-lg md:text-xl mb-8">
              聚合 19+ 热门平台，实时更新，随时随地掌握最新热点
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/hot"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-blue-600 font-bold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
              >
                <Flame className="w-5 h-5" />
                查看热榜
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors border border-white/30"
              >
                <Search className="w-5 h-5" />
                搜索热点
              </Link>
            </div>
          </div>

          {/* 平台徽章 */}
          <div className="flex flex-wrap justify-center gap-3 mt-12">
            {['微博', '知乎', '抖音', 'B站', 'GitHub', '豆瓣'].map((p, i) => (
              <span key={p} className="px-3 py-1.5 bg-white/10 backdrop-blur rounded-full text-sm text-white border border-white/20">
                {p}
              </span>
            ))}
            <span className="px-3 py-1.5 bg-yellow-400/20 backdrop-blur rounded-full text-sm text-yellow-200 border border-yellow-400/30">
              等19+平台
            </span>
          </div>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="sticky top-14 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-1 py-3 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => handleCategoryChange(null)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              全部
            </button>
            {isLoadingCategories ? (
              <span className="text-sm text-gray-400 flex-shrink-0">加载中...</span>
            ) : categoryError ? (
              <span className="text-sm text-red-400 flex-shrink-0">分类加载失败</span>
            ) : (
              categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.name)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === cat.name
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {cat.name}
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Nodes Grid */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        {isInitialLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                  <div className="w-24 h-4 bg-gray-200 rounded" />
                </div>
                <div className="space-y-2">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="w-full h-3 bg-gray-100 rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-20">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">{loadError}</p>
            <button
              onClick={() => loadNodes(0, true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              重试
            </button>
          </div>
        ) : allNodes.length === 0 ? (
          <div className="text-center py-20">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无数据</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
              {allNodes.map((node) => (
                <NodeCard key={node.id} node={node} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      加载中...
                    </>
                  ) : (
                    <>
                      加载更多
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {!hasMore && allNodes.length > 0 && (
              <p className="text-center text-gray-400 text-sm mt-6">
                已展示全部 {allNodes.length} 个平台
              </p>
            )}
          </>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">{APP_CONFIG.name}</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              {FOOTER_LINKS.map(link => (
                <Link key={link.href} href={link.href} className="hover:text-gray-700 transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} {APP_CONFIG.name}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
