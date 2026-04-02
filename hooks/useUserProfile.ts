/**
 * 用户资料 Hook — 基于本地 API
 */
'use client'
import { useState, useEffect, useCallback } from 'react'

export interface UserProfile {
  id: number
  email: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  created_at: string
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (data.success) {
        setProfile({
          id: data.user.id,
          email: data.user.email,
          display_name: data.user.displayName,
          avatar_url: data.user.avatarUrl,
          bio: data.user.bio,
          created_at: data.user.createdAt,
        })
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const updateProfile = useCallback(async (updates: Partial<Pick<UserProfile, 'display_name' | 'bio'>>) => {
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: updates.display_name, bio: updates.bio }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    setProfile(prev => prev ? { ...prev, ...updates } : prev)
    return data
  }, [])

  const uploadAvatar = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)
    const res = await fetch('/api/user/avatar', { method: 'POST', body: formData })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    setProfile(prev => prev ? { ...prev, avatar_url: data.avatarUrl } : prev)
    return data.avatarUrl
  }, [])

  return { profile, isLoading, error, updateProfile, uploadAvatar, reload: load }
}
