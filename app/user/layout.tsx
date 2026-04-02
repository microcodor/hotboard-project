'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { User, Star, History, Settings, CreditCard, Loader2, LogOut, ChevronLeft, Menu } from 'lucide-react'

const MENU_ITEMS = [
  { href: '/user',           icon: User,       label: '个人中心' },
  { href: '/user/favorites', icon: Star,       label: '我的收藏' },
  { href: '/user/history',  icon: History,    label: '浏览历史' },
  { href: '/user/settings', icon: Settings,  label: '账户设置' },
  { href: '/user/billing',  icon: CreditCard, label: '套餐与充值' },
]

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<{ displayName: string; email: string; avatarUrl?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r: Response) => r.json())
      .then((d: any) => {
        if (d.success) setUser(d.user)
        else router.push('/login')
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  const logout = async () => {
    await fetch('/api/auth/me', { method: 'DELETE', credentials: 'include' })
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!user) return null

  const currentMenu = MENU_ITEMS.find(m =>
    pathname === m.href || (m.href !== '/user' && pathname.startsWith(m.href))
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-all duration-200 fixed inset-y-0 left-0 z-20 pt-16 lg:static lg:pt-0`}>
        {/* 用户信息（仅移动端） */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-gray-100 lg:hidden">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold flex-shrink-0">
            {(user.displayName || user.email)[0].toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-gray-900 truncate">{user.displayName || '用户'}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>

        {/* 导航 */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {MENU_ITEMS.map(item => {
            const active = pathname === item.href || (item.href !== '/user' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* 底部操作 */}
        <div className="p-2 border-t border-gray-100 space-y-1">
          <Link href="/"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm">返回首页</span>}
          </Link>
          <button onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm">退出登录</span>}
          </button>
        </div>
      </aside>

      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* 主内容 */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 移动端顶部栏 */}
        <div className="lg:hidden h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <span className="font-medium text-gray-900">{currentMenu?.label || '个人中心'}</span>
        </div>

        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
