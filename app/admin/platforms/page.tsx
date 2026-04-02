'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Play, Loader2, Edit2, Trash2, Save, X, GripVertical, ArrowUp, ArrowDown } from 'lucide-react'

interface Platform {
  id: number; hashid: string; name: string; displayName: string
  url: string; logo: string; categoryName: string; displayOrder: number
  itemsCount: number; lastCrawled: string; status: string
}

const STATUS_COLORS: Record<string, string> = {
  ok: 'bg-green-100 text-green-700', warn: 'bg-yellow-100 text-yellow-700', empty: 'bg-red-100 text-red-700',
}
const STATUS_LABELS: Record<string, string> = { ok: '正常', warn: '警告', empty: '无数据' }

export default function AdminPlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Platform | null>(null)
  const [triggering, setTriggering] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/platforms')
    const data = await res.json()
    if (data.success) setPlatforms(data.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newPlatforms = [...platforms]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newPlatforms.length) return
    const [item] = newPlatforms.splice(index, 1)
    newPlatforms.splice(targetIndex, 0, item)
    // 更新 displayOrder
    newPlatforms.forEach((p, i) => p.displayOrder = i + 1)
    setPlatforms(newPlatforms)
  }

  const saveOrder = async () => {
    setSaving(true)
    try {
      const orders = platforms.map((p, i) => ({ id: p.id, displayOrder: i + 1 }))
      await fetch('/api/admin/platforms/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
      })
      setEditMode(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const deletePlatform = async (id: number) => {
    if (!confirm('确认删除该平台？所有相关热点数据将被清除！')) return
    await fetch(`/api/admin/platforms?id=${id}`, { method: 'DELETE' })
    load()
  }

  const triggerAll = async () => {
    setTriggering('all')
    await fetch('/api/admin/crawl', { method: 'POST' })
    setTimeout(() => setTriggering(null), 3000)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">平台管理</h1>
          <p className="text-sm text-gray-500 mt-1">拖拽调整顺序，点击"保存"生效</p>
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <button onClick={() => setEditMode(false)}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                <X className="w-4 h-4" /> 取消
              </button>
              <button onClick={saveOrder} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? '保存中...' : '保存排序'}
              </button>
            </>
          ) : (
            <>
              <button onClick={triggerAll} disabled={!!triggering}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                <Play className="w-4 h-4" /> {triggering === 'all' ? '执行中...' : '立即抓取'}
              </button>
              <button onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700">
                <GripVertical className="w-4 h-4" /> 调整排序
              </button>
            </>
          )}
          <button onClick={() => { setEditing(null); setShowModal(true) }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus className="w-4 h-4" /> 新增平台
          </button>
        </div>
      </div>

      {/* 提示 */}
      {editMode && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-700">
            <strong>排序模式：</strong>使用 ↑↓ 按钮调整顺序，调整完成后点击"保存排序"生效。
            首页将按此顺序显示平台。
          </p>
        </div>
      )}

      {/* 平台表格 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase w-16">顺序</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">平台</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">HashID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">分类</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">数据量</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></td></tr>
              ) : platforms.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">暂无平台</td></tr>
              ) : platforms.map((p, idx) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {editMode ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0}
                          className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 rounded">
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center font-mono text-sm text-gray-500">{p.displayOrder}</span>
                        <button onClick={() => moveItem(idx, 'down')} disabled={idx === platforms.length - 1}
                          className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 rounded">
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="flex items-center gap-2">
                        {editMode && <GripVertical className="w-4 h-4 text-gray-300" />}
                        <span className="w-6 text-center font-mono text-sm text-gray-500">{p.displayOrder}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.logo && <img src={p.logo} alt="" className="w-8 h-8 rounded-lg object-contain bg-gray-50" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                      <span className="font-medium text-gray-900">{p.displayName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.hashid}</td>
                  <td className="px-4 py-3 text-gray-600">{p.categoryName}</td>
                  <td className="px-4 py-3 text-gray-600">{p.itemsCount}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!editMode && (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditing(p); setShowModal(true) }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deletePlatform(p.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <PlatformModal
          platform={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}

function PlatformModal({ platform, onClose, onSaved }: { platform: Platform | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    hashid: platform?.hashid || '', name: platform?.name || '', displayName: platform?.displayName || '',
    url: platform?.url || '', logo: platform?.logo || '', categoryName: platform?.categoryName || '综合',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handle = async () => {
    if (!form.hashid || !form.name) { setError('HashID 和名称必填'); return }
    setSaving(true); setError('')
    try {
      const method = platform ? 'PATCH' : 'POST'
      const url = platform ? `/api/admin/platforms?id=${platform.id}` : '/api/admin/platforms'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      onSaved()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">{platform ? '编辑平台' : '新增平台'}</h2>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">HashID <span className="text-red-500">*</span></label>
            <input value={form.hashid} onChange={e => setForm(f => ({ ...f, hashid: e.target.value }))}
              disabled={!!platform} placeholder="如: weibo-hot"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">名称 <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="如: 微博热搜" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">显示名称</label>
            <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder="留空则使用名称" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
            <select value={form.categoryName} onChange={e => setForm(f => ({ ...f, categoryName: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option>综合</option><option>视频</option><option>新闻</option><option>科技</option><option>影视</option><option>国际</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
            <input value={form.logo} onChange={e => setForm(f => ({ ...f, logo: e.target.value }))}
              placeholder="https://.../favicon.ico" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">取消</button>
          <button onClick={handle} disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
