/**
 * 搜索输入框组件
 * 带防抖、自动补全、搜索历史
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import SearchSuggestion from './SearchSuggestion'

interface SearchInputProps {
  onSearch: (query: string) => void
  isLoading?: boolean
  placeholder?: string
  defaultValue?: string
  className?: string
  autoFocus?: boolean
}

export default function SearchInput({
  onSearch,
  isLoading = false,
  placeholder = '输入关键词搜索全网热点...',
  defaultValue = '',
  className,
  autoFocus = false,
}: SearchInputProps) {
  const [query, setQuery] = useState(defaultValue)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [justSelected, setJustSelected] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isComposing = useRef(false)

  // 防抖自动搜索（500ms）
  const debouncedSearch = useDebounce(
    useCallback(
      (q: string) => {
        if (q.trim() && !justSelected) {
          onSearch(q.trim())
        }
      },
      [onSearch, justSelected]
    ),
    500
  )

  // 监听输入变化
  useEffect(() => {
    if (justSelected) {
      setJustSelected(false)
      return
    }
    if (!isComposing.current) {
      debouncedSearch(query)
    }
  }, [query, debouncedSearch, justSelected])

  // 中文输入法处理
  const handleCompositionStart = () => {
    isComposing.current = true
  }

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposing.current = false
    setQuery(e.currentTarget.value)
  }

  // 提交搜索
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setShowSuggestions(false)
      onSearch(query.trim())
      addSearchHistory(query.trim())
    }
  }

  // 选择建议
  const handleSelectSuggestion = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    setJustSelected(true)
    onSearch(suggestion)
    addSearchHistory(suggestion)
    inputRef.current?.blur()
  }

  // 添加搜索历史
  const addSearchHistory = (q: string) => {
    try {
      const history: string[] = JSON.parse(
        localStorage.getItem('hotboard_search_history') || '[]'
      )
      const filtered = history.filter((item) => item !== q)
      const newHistory = [q, ...filtered].slice(0, 10)
      localStorage.setItem('hotboard_search_history', JSON.stringify(newHistory))
    } catch {
      // Ignore
    }
  }

  // 清空输入
  const handleClear = () => {
    setQuery('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  // 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K 聚焦搜索框
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      // Escape 关闭建议
      if (e.key === 'Escape' && showSuggestions) {
        setShowSuggestions(false)
        inputRef.current?.blur()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showSuggestions])

  return (
    <div className={cn('relative', className)}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={cn(
              'w-full pl-12 pr-20 py-4 text-lg border-2 border-gray-200 rounded-2xl',
              'focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10',
              'placeholder:text-gray-400 transition-all duration-200',
              'bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500',
              showSuggestions && 'border-blue-500 ring-4 ring-blue-500/10'
            )}
          />

          {/* 操作按钮 */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isLoading && (
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            )}
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              搜索
            </button>
          </div>

          {/* 快捷键提示 */}
          {!query && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 text-xs text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 font-mono">
                Ctrl
              </kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 font-mono">
                K
              </kbd>
            </div>
          )}
        </div>
      </form>

      {/* 搜索建议 */}
      {showSuggestions && (
        <SearchSuggestion
          query={query}
          onSelect={handleSelectSuggestion}
          onClose={() => setShowSuggestions(false)}
        />
      )}
    </div>
  )
}
