/**
 * 认证状态管理
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  
  setUser: (user: User | null, session: Session | null) => void
  setLoading: (loading: boolean) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  signup: (email: string, password: string) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,

      setUser: (user, session) => set({ user, session }),
      setLoading: (loading) => set({ isLoading: loading }),

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (error) throw error
          set({ user: data.user, session: data.session, isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, session: null })
      },

      signup: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          })
          if (error) throw error
          set({ user: data.user, session: data.session, isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },
    }),
    {
      name: 'hotboard-auth',
      partialize: (state) => ({
        // 不持久化敏感信息
      }),
    }
  )
)
