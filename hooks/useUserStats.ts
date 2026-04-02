/**
 * 用户统计 Hook — 基于本地 API
 */
'use client'
import { useState, useEffect } from 'react'

export interface UserStats {
  favorites_count: number
  history_count: number
  total_views: number
  joined_days: number
}

const DEFAULT_STATS: UserStats = {
  favorites_count: 0,
  history_count: 0,
  total_views: 0,
  joined_days: 0,
}

export function useUserStats() {
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/stats')
      .then(r => r.json())
      .then(data => {
        if (data.success) setStats(data.stats)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  return { stats, isLoading }
}
