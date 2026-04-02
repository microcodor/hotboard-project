'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, X, Search, User, LogOut, Settings, Star, History, Shield, ChevronDown } from 'lucide-react'

interface UserInfo {
  id: number
  email: string
  displayName: string
  avatarUrl: string | null
  role: string
}

export function Header() {
  const router = useRouter()
  const [menuOpen, setMenuOpen]     = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [user, setUser]             = useState<UserInfo | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.success) setUser(d.user)
    }).catch(() => {})
  }, [])

  // 点击外部关闭用户菜单
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const logout = async () => {
    await fetch('/api/auth/me', { method: 'DELETE' })
    setUser(null)
    setUserMenuOpen(false)
    router.push('/')
  }

  const navItems = [
    { label: '首页', href: '/' },
    { label: '热榜', href: '/hot' },
    { label: 'API 文档', href: '/docs' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 flex h-14 items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">H</div>
          <span className="font-bold text-gray-900 text-lg">HotBoard</span>
        </Link>

        {/* 桌面导航 */}
        <nav className="hidden md:flex items-center gap-1 ml-2">
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索热点..."
              className="w-full h-9 pl-9 pr-4 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition-colors"
            />
          </div>
        </form>

        <div className="flex-1 md:flex-none" />

        {/* 右侧操作区 */}
        <div className="flex items-center gap-2">
          {user ? (
            /* 已登录：用户头像菜单 */
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">
                    {(user.displayName || user.email)[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[80px] truncate">
                  {user.displayName || user.email.split('@')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                  <div className="px-4 py-2.5 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.displayName || '未设置昵称'}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <Link href="/user" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <User className="w-4 h-4 text-gray-400" /> 个人中心
                  </Link>
                  <Link href="/user/favorites" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Star className="w-4 h-4 text-gray-400" /> 我的收藏
                  </Link>
                  <Link href="/user/history" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <History className="w-4 h-4 text-gray-400" /> 浏览历史
                  </Link>
                  <Link href="/user/billing" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Settings className="w-4 h-4 text-gray-400" /> 套餐 & API Key
                  </Link>
                  {user.role === 'super_admin' && (
                    <>
                      <div className="border-t border-gray-100 my-1" />
                      <Link href="/admin" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50">
                        <Shield className="w-4 h-4 text-purple-500" /> 管理后台
                      </Link>
                    </>
                  )}
                  <div className="border-t border-gray-100 my-1" />
                  <button onClick={logout}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    <LogOut className="w-4 h-4" /> 退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* 未登录 */
            <div className="flex items-center gap-2">
              <Link href="/login"
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                登录
              </Link>
              <Link href="/register"
                className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                注册
              </Link>
            </div>
          )}

          {/* 移动端菜单按钮 */}
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 移动端菜单 */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-2">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索热点..."
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </form>
          {navItems.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
