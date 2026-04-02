'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw, Trash2, Loader2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'

interface Item {
  id: number
  node_hashid: string
  platform_name: string
  title: string
  url: string
  hot_value: string
  rank_num: number
  created_at: string
}

interface Platform { hashid: string; name: string }

export default function AdminItemsPage() {
  const [items, setItems]       = useState<Item[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [platform, setPlatform] = useState('')
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [clearing, setClearing] = useState(false)

  // 加载平台列表（用于筛选下拉）
  useEffect(() => {
    fetch('/api/admin/platforms').then(r => r.json()).then(d => {
      if (d.success) setPlatforms(d.data.map((p: any) => ({ hashid: p.hashid, name: p.displayName || p.name })))
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    const sp = new URLSearchParams({ page: String(page), limit: '20' })
    if (search)   sp.set('search', search)
    if (platform) sp.set('platform', platform)
    const res = await fetch(`/api/admin/items?${sp}`)
    const data = await res.json()
    if (data.success) { setItems(data.data); setTotal(data.total) }
    setLoading(false)
  }, [page, search, platform])

  useEffect(() => { load() }, [load])

  const deleteOne = async (id: number) => {
    if (!confirm('确认删除该条热点？')) return
    await fetch(`/api/admin/items?id=${id}`, { method: 'DELETE' })
    load()
  }

  const deleteBatch = async () => {
    if (selected.size === 0) return
    if (!confirm(`确认删除选中的 ${selected.size} 条热点？`)) return
    await fetch(`/api/admin/items?ids=${[...selected].join(',')}`, { method: 'DELETE' })
    load()
  }

  const clearPlatform = async () => {
    if (!platform) return
    const name = platforms.find(p => p.hashid === platform)?.name || platform
    if (!confirm(`确认清空「${name}」的全部热点数据？此操作不可恢复！`)) return
    setClearing(true)
    await fetch(`/api/admin/items?platform=${platform}`, { method: 'DELETE' })
    setClearing(false)
    load()
  }

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set())
    else setSelected(new Set(items.map(i => i.id)))
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">内容管理</h1>
          <p className="text-sm text-gray-500 mt-1">共 {total.toLocaleString()} 条热点数据</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={deleteBatch}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
              <Trash2 className="w-4 h-4" /> 删除选中 ({selected.size})
            </button>
          )}
          {platform && (
            <button onClick={clearPlatform} disabled={clearing}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50">
              <AlertTriangle className="w-4 h-4" />
              {clearing ? '清空中...' : '清空该平台'}
            </button>
          )}
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="搜索标题或链接..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <select value={platform} onChange={e => { setPlatform(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">全部平台</option>
          {platforms.map(p => <option key={p.hashid} value={p.hashid}>{p.name}</option>)}
        </select>
        <button onClick={load} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selected.size === items.length && items.length > 0}
                    onChange={toggleAll} className="rounded" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">排名</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">标题</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">平台</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">热度</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">抓取时间</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">暂无数据</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className={`hover:bg-gray-50 ${selected.has(item.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)} className="rounded" />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-center w-12">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      item.rank_num <= 3 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                    }`}>{item.rank_num}</span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="text-gray-900 hover:text-blue-600 line-clamp-1 font-medium">
                      {item.title}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      {item.platform_name || item.node_hashid}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.hot_value || '-'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(item.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteOne(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
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
            <span className="text-sm text-gray-500">
              第 {page}/{totalPages} 页，共 {total.toLocaleString()} 条
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">首页</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">末页</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
