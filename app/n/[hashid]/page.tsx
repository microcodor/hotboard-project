'use client'

import { useState, useEffect } from 'react'
import { useNodeDetail } from '@/hooks/useNodes'
import ItemCard from '@/components/cards/ItemCard'
import { Button } from '@/components/ui/button'
import { RefreshCw, ExternalLink, Star, ArrowLeft, Share2, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function NodeDetailPage() {
  const params = useParams()
  const hashid = params.hashid as string
  
  const { node, isLoading, error, refresh } = useNodeDetail(hashid)
  const [isFavorited, setIsFavorited] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 检查是否已收藏
  useEffect(() => {
    const checkFavorite = async () => {
      try {
        const response = await fetch(`/api/favorites/${hashid}`)
        if (response.ok) {
          const data = await response.json()
          setIsFavorited(data.isFavorited)
        }
      } catch (err) {
        console.error('检查收藏状态失败:', err)
      }
    }

    if (hashid) {
      checkFavorite()
    }
  }, [hashid])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleFavorite = async () => {
    try {
      const method = isFavorited ? 'DELETE' : 'POST'
      const response = await fetch(`/api/favorites/${hashid}`, { method })
      if (response.ok) {
        setIsFavorited(!isFavorited)
      }
    } catch (err) {
      console.error('操作收藏失败:', err)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: node?.name,
          text: node?.display,
          url: window.location.href,
        })
      } catch (err) {
        console.error('分享失败:', err)
      }
    } else {
      // 复制到剪贴板
      navigator.clipboard.writeText(window.location.href)
      alert('链接已复制到剪贴板')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">加载榜单中...</p>
        </div>
      </div>
    )
  }

  if (error || !node) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">榜单不存在</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error || '未找到该榜单'}</p>
          <Link href="/" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 返回导航 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>
        </div>
      </div>

      {/* 榜单头部 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Logo 和信息 */}
            <div className="flex items-start gap-4 flex-1">
              {node.logo && (
                <img
                  src={node.logo}
                  alt={node.name}
                  className="w-20 h-20 rounded-lg shadow-md object-cover flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/80'
                  }}
                />
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{node.name}</h1>
                {node.display && (
                  <p className="text-gray-600 dark:text-gray-400 mt-2">{node.display}</p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-3">
                  最后更新: {node.updated_at ? new Date(node.updated_at).toLocaleString('zh-CN') : '未知'}
                </p>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex-1 md:flex-none flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? '刷新中' : '刷新'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFavorite}
                className={`flex-1 md:flex-none flex items-center gap-2 ${
                  isFavorited ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700' : ''
                }`}
              >
                <Star className={`w-4 h-4 ${isFavorited ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                {isFavorited ? '已收藏' : '收藏'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="flex-1 md:flex-none flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                分享
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 热榜列表 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 列表标题 */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            热点列表 ({node.items?.length || 0})
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            实时更新的热点排行
          </p>
        </div>

        {/* 列表内容 */}
        {!node.items || node.items.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">暂无热点数据</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">请稍后再试或点击刷新</p>
          </div>
        ) : (
          <div className="space-y-3">
            {node.items.map((item, index) => (
              <ItemCard
                key={`${item.url}-${index}`}
                item={item}
                rank={index + 1}
                showRank={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部信息 */}
      <div className="max-w-4xl mx-auto px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>数据来源: {node.name}</p>
        <p className="mt-2">最后更新: {node.updated_at ? new Date(node.updated_at).toLocaleString('zh-CN') : '未知'}</p>
      </div>
    </div>
  )
}
