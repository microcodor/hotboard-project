'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, Loader2, Save, X } from 'lucide-react'

interface ApiDoc {
  id: number
  method: string
  path: string
  description: string
  params: string[]
  auth: string
  response: string
  group_name: string
  created_at: string
  updated_at: string
}

export default function ApiDocsManagementPage() {
  const [docs, setDocs] = useState<ApiDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    method: 'GET',
    path: '',
    description: '',
    params: '',
    auth: '',
    response: '',
    group_name: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/api-docs')
    const data = await res.json()
    if (data.success) setDocs(data.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const resetForm = () => {
    setForm({
      method: 'GET',
      path: '',
      description: '',
      params: '',
      auth: '',
      response: '',
      group_name: '',
    })
    setEditingId(null)
    setError('')
  }

  const handleEdit = (doc: ApiDoc) => {
    setForm({
      method: doc.method,
      path: doc.path,
      description: doc.description,
      params: Array.isArray(doc.params) ? doc.params.join(', ') : '',
      auth: doc.auth,
      response: doc.response,
      group_name: doc.group_name,
    })
    setEditingId(doc.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    setError('')
    if (!form.path || !form.description || !form.group_name) {
      setError('请填写必填字段：路径、描述、分组')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        params: form.params.split(',').map(p => p.trim()).filter(p => p),
      }

      const res = await fetch(
        editingId ? `/api/admin/api-docs?id=${editingId}` : '/api/admin/api-docs',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      const data = await res.json()
      if (data.success) {
        setShowForm(false)
        resetForm()
        load()
      } else {
        setError(data.error || '保存失败')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此接口文档？')) return

    const res = await fetch(`/api/admin/api-docs?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) load()
  }

  const groupedDocs = docs.reduce((acc, doc) => {
    const group = doc.group_name || '其他'
    if (!acc[group]) acc[group] = []
    acc[group].push(doc)
    return acc
  }, {} as Record<string, ApiDoc[]>)

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-blue-100 text-blue-700',
      POST: 'bg-green-100 text-green-700',
      PATCH: 'bg-yellow-100 text-yellow-700',
      DELETE: 'bg-red-100 text-red-700',
    }
    return colors[method] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API 接口文档管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理 API 文档内容，自动同步到公开文档页</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          新增接口
        </button>
      </div>

      {/* 表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? '编辑接口' : '新增接口'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">请求方法 *</label>
                <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>GET</option>
                  <option>POST</option>
                  <option>PATCH</option>
                  <option>DELETE</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分组 *</label>
                <input type="text" value={form.group_name} onChange={e => setForm(f => ({ ...f, group_name: e.target.value }))}
                  placeholder="如：公开接口、用户接口"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API 路径 *</label>
              <input type="text" value={form.path} onChange={e => setForm(f => ({ ...f, path: e.target.value }))}
                placeholder="/api/nodes"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述 *</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="接口功能描述"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">参数（逗号分隔）</label>
              <input type="text" value={form.params} onChange={e => setForm(f => ({ ...f, params: e.target.value }))}
                placeholder="cid=分类名, limit=数量, offset=偏移"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">认证方式</label>
              <input type="text" value={form.auth} onChange={e => setForm(f => ({ ...f, auth: e.target.value }))}
                placeholder="可选、必须、无需"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">响应示例</label>
              <textarea value={form.response} onChange={e => setForm(f => ({ ...f, response: e.target.value }))}
                placeholder='{ "success": true, "data": [...] }'
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
                取消
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 接口列表 */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
          </div>
        ) : Object.entries(groupedDocs).length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            暂无接口文档，点击"新增接口"创建
          </div>
        ) : (
          Object.entries(groupedDocs).map(([group, items]) => (
            <div key={group} className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900">{group}</h2>
              <div className="space-y-2">
                {items.map(doc => (
                  <div key={doc.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getMethodColor(doc.method)}`}>
                          {doc.method}
                        </span>
                        <code className="text-sm font-mono text-gray-900">{doc.path}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(doc)} className="p-1 hover:bg-gray-100 rounded">
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button onClick={() => handleDelete(doc.id)} className="p-1 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">{doc.description}</p>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {doc.params.length > 0 && (
                        <div>
                          <p className="text-gray-500 font-medium">参数</p>
                          <p className="text-gray-700">{doc.params.join(', ')}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-500 font-medium">认证</p>
                        <p className="text-gray-700">{doc.auth || '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
