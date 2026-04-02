'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Download, RefreshCw, Ban, Trash2, Loader2, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react'

interface CardKey {
  id: number; code: string; type: string; status: string
  batch_id: string; note: string; credits_amount: number | null
  duration_days: number | null; used_at: string | null; created_at: string
  plan_name: string | null; plan_slug: string | null; used_by_email: string | null
}

const TYPE_LABELS: Record<string, string> = {
  plan_monthly: '包月套餐', plan_yearly: '包年套餐', credits: '点数充值',
}
const STATUS_COLORS: Record<string, string> = {
  unused: 'bg-green-100 text-green-700',
  used: 'bg-gray-100 text-gray-500',
  disabled: 'bg-red-100 text-red-600',
}

export default function AdminCardsPage() {
  const [cards, setCards] = useState<CardKey[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '', type: '', batch: '' })
  const [showGen, setShowGen] = useState(false)
  const [newCodes, setNewCodes] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const sp = new URLSearchParams({ page: String(page), limit: '20' })
    if (filter.status) sp.set('status', filter.status)
    if (filter.type) sp.set('type', filter.type)
    if (filter.batch) sp.set('batch', filter.batch)
    const res = await fetch(`/api/admin/cards?${sp}`)
    const data = await res.json()
    if (data.success) { setCards(data.data); setTotal(data.total) }
    setLoading(false)
  }, [page, filter])

  useEffect(() => { load() }, [load])

  const disableCard = async (id: number) => {
    const card = cards.find(c => c.id === id)
    const newStatus = card?.status === 'disabled' ? 'unused' : 'disabled'
    await fetch(`/api/admin/cards?id=${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    load()
  }

  const deleteCard = async (id: number) => {
    if (!confirm('确认删除此卡密？')) return
    await fetch(`/api/admin/cards?id=${id}`, { method: 'DELETE' })
    load()
  }

  const copyAll = async () => {
    await navigator.clipboard.writeText(newCodes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const exportCsv = () => {
    const rows = ['卡密,类型,金额,状态,批次,使用者,创建时间']
    cards.forEach(c => rows.push(
      `${c.code},${TYPE_LABELS[c.type] || c.type},${c.credits_amount || '-'},${
        c.status === 'unused' ? '未使用' : c.status === 'used' ? '已使用' : '已禁用'},${
        c.batch_id},${c.used_by_email || '-'},${new Date(c.created_at).toLocaleString('zh-CN')}`
    ))
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `cards-${Date.now()}.csv`
    a.click()
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">卡密管理</h1>
          <p className="text-sm text-gray-500 mt-1">共 {total} 张卡密</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            <Download className="w-4 h-4" /> 导出 CSV
          </button>
          <button onClick={() => { setShowGen(true); setNewCodes([]) }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus className="w-4 h-4" /> 生成卡密
          </button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex gap-3 flex-wrap">
        <select value={filter.status} onChange={e => { setFilter(f => ({ ...f, status: e.target.value })); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">全部状态</option>
          <option value="unused">未使用</option>
          <option value="used">已使用</option>
          <option value="disabled">已禁用</option>
        </select>
        <select value={filter.type} onChange={e => { setFilter(f => ({ ...f, type: e.target.value })); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">全部类型</option>
          <option value="credits">点数充值</option>
          <option value="plan_monthly">包月套餐</option>
          <option value="plan_yearly">包年套餐</option>
        </select>
        <input value={filter.batch} onChange={e => { setFilter(f => ({ ...f, batch: e.target.value })); setPage(1) }}
          placeholder="批次号搜索..." className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
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
                {['卡密', '类型', '金额', '状态', '批次', '使用者', '创建时间', '操作'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></td></tr>
              ) : cards.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">暂无数据</td></tr>
              ) : cards.map(card => (
                <tr key={card.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{card.code}</td>
                  <td className="px-4 py-3 text-gray-600">{TYPE_LABELS[card.type] || card.type}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {card.credits_amount ? `${card.credits_amount} 次` : (card.plan_name || '-')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[card.status] || ''}`}>
                      {card.status === 'unused' ? '未使用' : card.status === 'used' ? '已使用' : '已禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{card.batch_id}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{card.used_by_email || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(card.created_at).toLocaleDateString('zh-CN')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {card.status !== 'used' && (
                        <button onClick={() => disableCard(card.id)} title={card.status === 'disabled' ? '启用' : '禁用'}
                          className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors">
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {card.status === 'unused' && (
                        <button onClick={() => deleteCard(card.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">第 {page}/{totalPages} 页，共 {total} 条</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">首页</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">末页</button>
            </div>
          </div>
        )}
      </div>

      {showGen && (
        <GenerateModal onClose={() => setShowGen(false)} onGenerated={(codes) => { setNewCodes(codes); load() }} />
      )}

      {newCodes.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium text-green-800">✅ 成功生成 {newCodes.length} 张卡密</p>
            <button onClick={copyAll} className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-900">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制' : '复制全部'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-48 overflow-y-auto">
            {newCodes.map(c => (
              <code key={c} className="text-xs bg-white border border-green-200 rounded px-2 py-1 font-mono text-green-800">{c}</code>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GenerateModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: (codes: string[]) => void }) {
  const PRESETS = [
    { label: '100 次（¥1）',   amount: 100 },
    { label: '500 次（¥4）',   amount: 500 },
    { label: '1000 次（¥7）',  amount: 1000 },
    { label: '5000 次（¥28）', amount: 5000 },
    { label: '10000 次（¥50）',amount: 10000 },
  ]
  const [amount, setAmount] = useState(1000)
  const [count, setCount] = useState(1)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!amount || amount < 1) { setError('请输入有效次数'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/cards', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'credits', creditsAmount: amount, count, note }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      onGenerated(data.codes)
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5">
        <h2 className="text-lg font-bold text-gray-900">生成充值卡密</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">选择面值（1分/次）</label>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map(opt => (
              <button key={opt.amount}
                onClick={() => setAmount(opt.amount)}
                className={`py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${
                  amount === opt.amount ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">自定义次数</label>
          <input type="number" value={amount} min={1}
            onChange={e => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">生成数量</label>
          <input type="number" value={count} min={1} max={500}
            onChange={e => setCount(Math.min(500, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">备注（可选）</label>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="如：618活动"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">取消</button>
          <button onClick={submit} disabled={loading}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            生成 {count} 张 × {amount.toLocaleString()} 次
          </button>
        </div>
      </div>
    </div>
  )
}
