/**
 * 修改基本资料表单
 */
'use client'
import { useState } from 'react'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useAuth } from '@/hooks/useAuth'
import { Loader2, Save } from 'lucide-react'

export default function ProfileEditForm() {
  const { profile, updateProfile } = useUserProfile()
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      await updateProfile({ display_name: displayName, bio })
      setMsg({ type: 'ok', text: '保存成功' })
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">邮箱</label>
        <input value={user?.email || ''} disabled
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">昵称</label>
        <input value={displayName} onChange={e => setDisplayName(e.target.value)}
          placeholder="输入昵称" maxLength={50}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">个人简介</label>
        <textarea value={bio} onChange={e => setBio(e.target.value)}
          placeholder="介绍一下自己..." rows={3} maxLength={200}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none" />
        <p className="text-xs text-gray-400 mt-1">{bio.length}/200</p>
      </div>
      {msg && (
        <p className={`text-sm ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>
      )}
      <button type="submit" disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        保存修改
      </button>
    </form>
  )
}
