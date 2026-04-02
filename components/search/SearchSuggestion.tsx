/**
 * 搜索建议组件
 * 提供搜索历史和热门搜索建议
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { Clock, TrendingUp, X, Search, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchSuggestionProps {
  query: string
  onSelect: (suggestion: string) => void
  onClose: () => void
  className?: string
}

const HOT_SEARCHES = [
  'ChatGPT',
  'AI 人工智能',
  '苹果发布会',
  '特斯拉',
  '比特币',
  'ChatGPT',
  '新能源汽车',
  '科技新闻',
  '热门电影',
  '游戏推荐',
]

export default function SearchSuggestion({
  query,
  onSelect,
  onClose,
  className,
}: SearchSuggestionProps) {
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // 加载搜索历史
  useEffect(() => {
    try {
      const history = localStorage.getItem('hotboard_search_history')
      if (history) {
        setSearchHistory(JSON.parse(history))
      }
    } catch {
      setSearchHistory([])
    }
  }, [])

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // 清除历史
  const handleClearHistory = () => {
    localStorage.removeItem('hotboard_search_history')
    setSearchHistory([])
  }

  // 删除单个历史记录
  const handleRemoveHistory = (e: React.MouseEvent, item: string) => {
    e.stopPropagation()
    const newHistory = searchHistory.filter((h) => h !== item)
    setSearchHistory(newHistory)
    localStorage.setItem('hotboard_search_history', JSON.stringify(newHistory))
  }

  // 过滤建议
  const filteredHistory = searchHistory.filter((h) =>
    h.toLowerCase().includes(query.toLowerCase())
  )
  const filteredHotSearches = HOT_SEARCHES.filter((h) =>
    h.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[400px] overflow-auto',
        className
      )}
    >
      {/* 搜索历史 */}
      {searchHistory.length > 0 && (
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>搜索历史</span>
            </div>
            <button
              onClick={handleClearHistory}
              className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              清空
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {filteredHistory.slice(0, 8).map((item, index) => (
              <div
                key={index}
                onClick={() => onSelect(item)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-blue-50 rounded-full text-sm cursor-pointer group transition-colors"
              >
                <span className="text-gray-700 group-hover:text-blue-600">{item}</span>
                <button
                  onClick={(e) => handleRemoveHistory(e, item)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 热门搜索 */}
      {filteredHotSearches.length > 0 && (
        <div className="p-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span>热门搜索</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {filteredHotSearches.slice(0, 10).map((item, index) => (
              <div
                key={index}
                onClick={() => onSelect(item)}
                className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 rounded-full text-sm cursor-pointer text-orange-600 transition-colors"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {filteredHistory.length === 0 && filteredHotSearches.length === 0 && (
        <div className="p-8 text-center text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>暂无搜索建议</p>
        </div>
      )}
    </div>
  )
}
