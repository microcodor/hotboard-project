/**
 * 浏览历史 Hook — 基于本地 API
 */
'use client'
import { useState, useEffect, useCallback } from 'react'

export interface HistoryItem {
  id: number
  nodeHashid: string
  nodeName: string
  nodeDisplayName: string
  categoryName: string
  viewedAt: string
}

export function useBrowseHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/history')
      const data = await res.json()
      if (data.success) setHistory(data.data || [])
      else setError(data.error)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addHistory = useCallback(async (nodeHashid: string) => {
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeHashid }),
    }).catch(() => {})
  }, [])

  const clearHistory = useCallback(async () => {
    const res = await fetch('/api/history', { method: 'DELETE' })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    setHistory([])
  }, [])

  const removeItem = useCallback(async (id: number) => {
    const res = await fetch(`/api/history?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    setHistory(prev => prev.filter(h => h.id !== id))
  }, [])

  return { history, isLoading, error, addHistory, clearHistory, removeItem, reload: load }
}
