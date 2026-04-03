/**
 * API Key 管理 + 偏好设置
 */
'use client'
import { useState, useEffect } from 'react'
import { Key, Plus, Trash2, Copy, Check, Loader2 } from 'lucide-react'

interface ApiKey {
  id: number
  name: string
  keyPreview: string
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
}

export default function PreferencesForm() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const loadKeys = async () => {
    const res = await fetch('/api/auth/keys')
    const data = await res.json()
    if (data.success) setKeys(data.keys)
    setLoading(false)
  }

  useEffect(() => { loadKeys() }, [])

  const createKey = async () => {
    if (!newKeyName.trim()) { setMsg('请输入 Key 名称'); return }
    setCreating(true); setMsg(null)
    try {
      const res = await fetch('/api/auth/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setNewKeyValue(data.key)
      setNewKeyName('')
      await loadKeys()
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setCreating(false)
    }
  }

  const deleteKey = async (id: number) => {
    if (!confirm('确认删除此 API Key？')) return
    await fetch(`/api/auth/keys?id=${id}`, { method: 'DELETE' })
    setKeys(prev => prev.filter(k => k.id !== id))
  }

  // 复制功能 - 注意：完整 key 仅在创建时显示一次，无法找回
  const copyKey = async (key: string) => {
    try {
      // 兼容非 HTTPS 环境
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(key)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = key
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Copy failed:', e)
    }
  }

  return (
    <div className="space-y-6">
      {/* API Key 管理 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">API Key 管理</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          使用 API Key 访问 HotBoard 数据接口。格式：<code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">Authorization: Bearer hb_xxx</code>
        </p>

        {/* 新建 Key */}
        <div className="flex gap-2 mb-4">
          <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
            placeholder="Key 名称（如：我的应用）"
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            onKeyDown={e => e.key === 'Enter' && createKey()}
          />
          <button onClick={createKey} disabled={creating}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            新建
          </button>
        </div>

        {/* 新建成功提示 */}
        {newKeyValue && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-xs text-green-700 dark:text-green-400 mb-2 font-medium">⚠️ 请立即复制，此 Key 只显示一次</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded px-2 py-1 break-all">{newKeyValue}</code>
              <button onClick={() => copyKey(newKeyValue)}
                className="flex-shrink-0 p-1.5 text-green-600 hover:bg-green-100 rounded">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {msg && <p className="text-sm text-red-500 mb-3">{msg}</p>}

        {/* Key 列表 */}
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : keys.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">暂无 API Key</p>
        ) : (
          <div className="space-y-2">
            {keys.map(k => (
              <div key={k.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{k.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{k.keyPreview} 
                      <span className="text-gray-300 text-xs">(点击右侧图标复制预览，完整 key 仅创建时可见)</span></p>
                  <p className="text-xs text-gray-400">
                    创建于 {new Date(k.createdAt).toLocaleDateString('zh-CN')}
                    {k.lastUsedAt && ` · 最近使用 ${new Date(k.lastUsedAt).toLocaleDateString('zh-CN')}`}
                  </p>
                </div>
                <button onClick={() => copyKey(k.keyPreview)}
                  title="点击复制（仅显示预览，需完整 key 请删除后重建）"
                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
                <button onClick={() => deleteKey(k.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
