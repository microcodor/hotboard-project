/**
 * 加载骨架屏组件
 */

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  count?: number
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-700 rounded animate-pulse',
        className
      )}
    />
  )
}

export function NodeCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  )
}

export function ItemCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex gap-4">
        <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
        <Skeleton className="w-20 h-14 rounded-md flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  )
}

export function NodeDetailHeaderSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-8 w-1/2 mb-3" />
          <Skeleton className="h-4 w-2/3 mb-3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-20 h-10 rounded" />
          <Skeleton className="w-20 h-10 rounded" />
        </div>
      </div>
    </div>
  )
}
