'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Layers, Key, Play, LogOut, ChevronLeft, Menu, Loader2, FileText, BookOpen, Code
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin',           icon: LayoutDashboard, label: '仪表盘' },
  { href: '/admin/users',     icon: Users,           label: '用户管理' },
  { href: '/admin/platforms', icon: Layers,          label: '平台管理' },
  { href: '/admin/items',     icon: FileText,        label: '内容管理' },
  { href: '/admin/cards',     icon: Key,             label: '卡密管理' },
  { href: '/admin/crawl',     icon: Play,            label: '抓取任务' },
  { href: '/admin/api-docs',  icon: Code,            label: 'API 文档' },
  { href: '/admin/knowledge-base', icon: BookOpen,   label: '知识库' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (isLoginPage) { setChecking(false); return }
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => {
        if (d.success) setAuthed(true)
        else router.replace('/admin/login')
      })
      .catch(() => router.replace('/admin/login'))
      .finally(() => setChecking(false))
  }, [isLoginPage, router])

  // 登录页：直接渲染，不套侧边栏
  if (isLoginPage) return <>{children}</>

  // 鉴权检查中
  if (checking) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  )

  if (!authed) return null

  const logout = async () => {
    await fetch('/api/admin/auth/login', { method: 'DELETE' })
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} bg-gray-900 text-white flex flex-col flex-shrink-0 transition-all duration-200`}>
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-800">
          {sidebarOpen && <span className="font-bold text-base truncate">HotBoard Admin</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-gray-800 rounded flex-shrink-0">
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}>
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-2 border-t border-gray-800">
          <button onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors">
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm">退出登录</span>}
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto min-h-screen">
        {children}
      </main>
    </div>
  )
}
