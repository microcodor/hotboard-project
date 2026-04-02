/**
 * 热点项卡片组件
 */

'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ItemCardProps {
  item: {
    title: string
    description?: string
    url: string
    thumbnail?: string
    node_name?: string
    node_hashid?: string
  }
  rank?: number
  showRank?: boolean
  showThumbnail?: boolean
  className?: string
}

export default function ItemCard({ item, rank, showRank = true, showThumbnail = true, className }: ItemCardProps) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-blue-200 transition-all duration-200',
        className
      )}
    >
      <div className="flex gap-4">
        {/* 排名 */}
        {showRank && rank && (
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0',
            rank <= 3 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'
          )}>
            {rank}
          </div>
        )}
        
        {/* 缩略图 */}
        {showThumbnail && item.thumbnail && (
          <div className="w-20 h-14 rounded-md bg-gray-100 flex-shrink-0 overflow-hidden">
            <img
              src={item.thumbnail}
              alt={item.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        
        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 line-clamp-2">
            {item.title}
          </h3>
          {item.description && (
            <p className="text-sm text-gray-500 line-clamp-1 mt-1">
              {item.description}
            </p>
          )}
          {item.node_name && (
            <p className="text-xs text-gray-400 mt-1">
              来源: {item.node_name}
            </p>
          )}
        </div>
        
        {/* 外链图标 */}
        <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
      </div>
    </a>
  )
}
