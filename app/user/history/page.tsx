'use client'

import { useBrowseHistory } from '@/hooks/useBrowseHistory'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { History, Trash2 } from 'lucide-react'

export default function HistoryPage() {
  const { history, isLoading, clearHistory, removeHistoryItem } = useBrowseHistory()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const handleClear = async () => {
    setIsClearing(true)
    try { await clearHistory() } finally { setIsClearing(false); setShowClearConfirm(false) }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="w-7 h-7 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900">浏览历史</h1>
        </div>
        {history.length > 0 && (
          <div>
            {showClearConfirm ? (
              <div className="flex gap-2">
                <Button onClick={handleClear} disabled={isClearing} size="sm" className="bg-red-600 hover:bg-red-700">
                  {isClearing ? '清空中...' : '确认清空'}
                </Button>
                <Button onClick={() => setShowClearConfirm(false)} disabled={isClearing} variant="outline" size="sm">取消</Button>
              </div>
            ) : (
              <Button onClick={() => setShowClearConfirm(true)} variant="outline" size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-1" />清空历史
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 空状态 */}
      {history.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <History className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-3">还没有浏览历史</p>
            <a href="/" className="text-blue-600 hover:underline text-sm">去发现热门榜单 →</a>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {history.map(item => (
            <Card key={item.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <a href={`/n/${item.node_hashid}`} className="text-blue-600 hover:underline font-medium">
                        {item.node_name}
                      </a>
                      {item.item_title && (
                        <>
                          <span className="text-gray-300">/</span>
                          <span className="text-gray-600 truncate">{item.item_title}</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(item.viewed_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <button onClick={() => removeHistoryItem(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
