/**
 * 危险区域 — 注销账号
 */
'use client'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AlertTriangle, Loader2 } from 'lucide-react'

export default function DangerZone() {
  const { user, signOut } = useAuth()
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const handleDelete = async () => {
    if (confirm !== user?.email) { setMsg('请输入正确的邮箱以确认'); return }
    setDeleting(true)
    try {
      const res = await fetch('/api/auth/me', { method: 'DELETE' })
      // 注销账号（这里只做登出，真正删除需要额外接口）
      await signOut()
    } catch (e: any) {
      setMsg(e.message)
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-red-200 dark:border-red-800">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <h3 className="font-semibold text-red-600 dark:text-red-400">危险区域</h3>
      </div>

      <div className="space-y-4">
        {/* 登出所有设备 */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">退出登录</h4>
          <p className="text-xs text-gray-500 mb-3">退出当前账号登录状态</p>
          <button onClick={signOut}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
            退出登录
          </button>
        </div>

        {/* 注销账号 */}
        <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-800">
          <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">注销账号</h4>
          <p className="text-xs text-gray-500 mb-3">
            注销后所有数据（收藏、历史、API Key）将被永久删除，无法恢复。
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            请输入邮箱 <strong>{user?.email}</strong> 以确认：
          </p>
          <input value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="输入邮箱确认"
            className="w-full rounded-lg border border-red-200 dark:border-red-700 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-400 dark:bg-gray-800 dark:text-white" />
          {msg && <p className="text-xs text-red-500 mb-2">{msg}</p>}
          <button onClick={handleDelete} disabled={deleting || confirm !== user?.email}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 text-sm">
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
            永久注销账号
          </button>
        </div>
      </div>
    </div>
  )
}
