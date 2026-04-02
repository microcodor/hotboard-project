/**
 * 分类导航组件
 */

'use client'

import { useNodes } from '@/hooks/useNodes'
import { CATEGORY_MAP, ALL_CATEGORIES } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface CategoryNavProps {
  selectedCid?: number
  onSelect: (cid: number | undefined) => void
}

export default function CategoryNav({ selectedCid, onSelect }: CategoryNavProps) {
  const categories = Object.entries(CATEGORY_MAP).map(([id, data]) => ({
    id: parseInt(id),
    ...data
  }))

  return (
    <div className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-1 py-3 overflow-x-auto scrollbar-hide">
          {/* 全部分类 */}
          <button
            onClick={() => onSelect(undefined)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              selectedCid === undefined
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {ALL_CATEGORIES.name}
          </button>
          
          {/* 分隔线 */}
          <div className="w-px h-6 bg-gray-200 mx-2" />
          
          {/* 分类列表 */}
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onSelect(category.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                selectedCid === category.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
