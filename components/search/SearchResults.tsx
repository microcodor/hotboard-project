/**
 * 搜索结果组件
 * 展示搜索结果列表，支持无限滚动
 */

'use client'

import { useCallback } from 'react'
import ItemCard from '@/components/cards/ItemCard'
import { Search, Loader2, AlertCircle, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInfiniteScroll } from '@/lib/performance'

interface SearchResultItem {
  title: string
  description?: string
  url: string
  thumbnail?: string
  node_name?: string
  node_hashid?: string
}

interface SearchResultsProps {
  results: SearchResultItem[]
  total: number
  query: string
  isLoading: boolean
  error?: string | null
  page: number
  hasMore: boolean
  onLoadMore: () => void
  sortBy: string
  onSortChange: (sortBy: string) => void
  className?: string
}

export default function SearchResults({
  results,
  total,
  query,
  isLoading,
  error,
  hasMore,
  onLoadMore,
  sortBy,
  onSortChange,
  className,
}: SearchResultsProps) {
  const { observerRef } = useInfiniteScroll(onLoadMore, hasMore)

  if (error && results.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-16 text-center',
          className
        )}
      >
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-gray-900 font-medium text-lg">搜索失败</p>
        <p className="text-gray-500 text-sm mt-2 max-w-md">{error}</p>
        <p className="text-gray-400 text-xs mt-4">请检查网络连接后重试</p>
      </div>
    )
  }

  if (!isLoading && results.length === 0 && query) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-16 text-center',
          className
        )}
      >
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Search className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-900 font-medium text-lg">未找到相关结果</p>
        <p className="text-gray-500 text-sm mt-2 max-w-md">
          没有找到与 &quot;{query}&quot; 相关的热点内容，试试其他关键词吧
        </p>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => {
              // 可以触发热门推荐
            }}
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors"
          >
            查看热门话题
          </button>
          <button
            onClick={() => {
              onSortChange('hot')
            }}
            className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm hover:bg-gray-100 transition-colors"
          >
            按热度排序
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('', className)}>
      {/* 结果头部 */}
      {results.length > 0 && (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500">
            找到 <span className="font-medium text-gray-900">{total}</span> 条与
            &quot;{query}&quot; 相关的结果
          </div>

          {/* 排序选项 */}
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500 mr-2">排序:</span>
            {[
              { key: 'relevance', label: '相关性' },
              { key: 'hot', label: '热度' },
              { key: 'latest', label: '最新' },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => onSortChange(option.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm transition-colors',
                  sortBy === option.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 搜索结果列表 */}
      <div className="space-y-3">
        {results.map((item, index) => (
          <div key={`${item.url}-${index}`} className="animate-in">
            <ItemCard item={item} rank={index + 1} showRank />
          </div>
        ))}
      </div>

      {/* 加载更多 */}
      {isLoading && results.length === 0 && (
        <div className="flex flex-col items-center py-12">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
          <p className="text-gray-500">正在搜索...</p>
        </div>
      )}

      {/* 无限滚动触发器 */}
      {hasMore && results.length > 0 && (
        <div ref={observerRef} className="py-8 text-center">
          {isLoading ? (
            <div className="flex items-center justify-center gap-3 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>加载更多结果...</span>
            </div>
          ) : (
            <button
              onClick={onLoadMore}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm transition-colors"
            >
              加载更多
            </button>
          )}
        </div>
      )}

      {/* 无更多结果 */}
      {!hasMore && results.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
          <BookOpen className="w-4 h-4" />
          <span className="text-sm">已显示全部 {total} 条结果</span>
        </div>
      )}
    </div>
  )
}
