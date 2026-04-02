/**
 * 收藏按钮组件
 */
'use client'
import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  hashid: string
  className?: string
}

export default function FavoriteButton({ hashid, className }: FavoriteButtonProps) {
  const { user } = useAuth()
  const [isFav, setIsFav] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    fetch(`/api/favorites/${hashid}`)
      .then(r => r.json())
      .then(d => { if (d.success) setIsFav(d.isFavorited) })
      .catch(() => {})
  }, [hashid, user])

  const toggle = async () => {
    if (!user) { window.location.href = '/login'; return }
    setLoading(true)
    try {
      if (isFav) {
        await fetch(`/api/favorites/${hashid}`, { method: 'DELETE' })
        setIsFav(false)
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hashid }),
        })
        setIsFav(true)
      }
    } catch (e) {}
    finally { setLoading(false) }
  }

  return (
    <button onClick={toggle} disabled={loading}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
        isFav
          ? 'bg-yellow-50 text-yellow-600 border border-yellow-200 hover:bg-yellow-100'
          : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100',
        className
      )}>
      <Star className={cn('w-4 h-4', isFav && 'fill-yellow-400 text-yellow-400')} />
      {isFav ? '已收藏' : '收藏'}
    </button>
  )
}
