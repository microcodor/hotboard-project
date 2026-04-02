'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw, Loader2, Trash2, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react'

interface User {
  id: number; email: string; displayName: string; avatarUrl: string | null
  createdAt: string; planName: string; planSlug: string; expiresAt: string | null
  favCount: number; keyCount: number; historyCount: number
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  basic: 'bg-blue-100 text-blue-600',
  pro: 'bg-purple-100 text-purple-600',
  enterprise: 'bg-amber-100 text-amber-600',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const sp = new URLSearchParams({ page: String(page), limit: '20' })
    if (search) sp.set('search', search)
    const res = await fetch(`/api/admin/users?${sp}`)
    const data = await res.json()
    if (data.success) { setUsers(data.data); setTotal(data.total) }
    setLoading(false)
  }, [page, search])

  useEffect(() => { load() }, [load])

  const deleteUser = async (id: number) => {
    if (!confirm('确认删除该用户？此操作不可恢复！')) return
    await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
    load()
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
        <p className="text-sm text-gray-500">共 {total} 用户</p>
      </div>

      {/* 搜索栏 */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="搜索邮箱或昵称..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={load} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">用户</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">套餐</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">收藏</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">API Keys</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">注册时间</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">暂无数据</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{u.displayName || '-'}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[u.planSlug]}`}>
                      {u.planName}
                    </span>
                    {u.expiresAt && <p className="text-xs text-gray-400 mt-0.5">至 {new Date(u.expiresAt).toLocaleDateString('zh-CN')}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.favCount}</td>
                  <td className="px-4 py-3 text-gray-600">{u.keyCount}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString('zh-CN')}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteUser(u.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">第 {page}/{totalPages} 页</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
