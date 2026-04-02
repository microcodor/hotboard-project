'use client'

import { useFavorites } from '@/hooks/useFavorites'
import { useState } from 'react'
import NodeCard from '@/components/cards/NodeCard'
import { Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Node } from '@/types'

const ITEMS_PER_PAGE = 12

export default function FavoritesPage() {
  const { favorites, isLoading, removeFavorite } = useFavorites()
  const [currentPage, setCurrentPage] = useState(1)

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  const totalPages = Math.ceil(favorites.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginated = favorites.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 头部 */}
      <div className="flex items-center gap-3">
        <Star className="w-7 h-7 text-yellow-500" />
        <h1 className="text-2xl font-bold text-gray-900">我的收藏</h1>
        {favorites.length > 0 && (
          <span className="text-gray-500 text-base">({favorites.length} 个)</span>
        )}
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <Star className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-3">还没有收藏任何榜单</p>
          <a href="/" className="text-blue-600 hover:underline text-sm">去发现热门榜单 →</a>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated.map(node => (
              <NodeCard key={node.hashid} node={node as Node} onRemove={() => removeFavorite(node.hashid)} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                disabled={currentPage === 1} variant="outline" size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" />上一页
              </Button>
              <span className="text-sm text-gray-500 px-2">第 {currentPage} / {totalPages} 页</span>
              <Button onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                disabled={currentPage === totalPages} variant="outline" size="sm">
                下一页<ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
