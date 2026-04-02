/**
 * 收藏 Hook — 基于本地 API
 */
'use client'
import { useState, useEffect, useCallback } from 'react'

export interface FavoriteNode {
  hashid: string
  name: string
  displayName: string
  categoryName: string
  url: string
  logo: string | null
  itemsCount: number
  favoritedAt: string
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/favorites')
      const data = await res.json()
      if (data.success) setFavorites(data.data || [])
      else setError(data.error)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addFavorite = useCallback(async (hashid: string) => {
    const res = await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hashid }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    await load()
  }, [load])

  const removeFavorite = useCallback(async (hashid: string) => {
    const res = await fetch(`/api/favorites/${hashid}`, { method: 'DELETE' })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    setFavorites(prev => prev.filter(f => f.hashid !== hashid))
  }, [])

  const isFavorited = useCallback((hashid: string) => {
    return favorites.some(f => f.hashid === hashid)
  }, [favorites])

  return { favorites, isLoading, error, addFavorite, removeFavorite, isFavorited, reload: load }
}
