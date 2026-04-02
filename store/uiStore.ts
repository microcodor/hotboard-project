/**
 * UI 状态管理
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface UIState {
  theme: Theme
  sidebarOpen: boolean
  searchModalOpen: boolean
  
  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  setSearchModalOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      sidebarOpen: false,
      searchModalOpen: false,

      setTheme: (theme) => {
        set({ theme })
        
        // 应用主题
        const root = document.documentElement
        const isDark = theme === 'dark' || 
          (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
        
        root.classList.toggle('dark', isDark)
      },

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSearchModalOpen: (open) => set({ searchModalOpen: open }),
    }),
    {
      name: 'hotboard-ui',
      partialize: (state) => ({
        theme: state.theme,
      }),
    }
  )
)

// 初始化主题
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('hotboard-ui')
  if (stored) {
    const { state } = JSON.parse(stored)
    if (state?.theme) {
      const root = document.documentElement
      const isDark = state.theme === 'dark' || 
        (state.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      root.classList.toggle('dark', isDark)
    }
  }
}
