'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, TrendingUp, ExternalLink, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

interface SearchResult {
  id: number; node_hashid: string; title: string; url: string
  hot_value: number; rank: number; thumbnail: string | null
  created_at: string; platform_name: string; platform_display: string; platform_logo: string | null
}

interface Platform { hashid: string; name: string }

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQ = searchParams.get('q') || ''

  const [query, setQuery]       = useState(initialQ)
  const [input, setInput]       = useState(initialQ)
  const [platform, setPlatform] = useState('')
  const [results, setResults]   = useState<SearchResult[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(false)
  const [platforms, setPlatforms] = useState<Platform[]>([])

  useEffect(() => {
    fetch('/api/admin/platforms', { credentials: 'include' }).then(r => r.json()).then(d => {
      if (d.success) setPlatforms(d.data.map((p: any) => ({ hashid: p.hashid, name: p.displayName || p.name })))
    }).catch(() => {})
  }, [])

  const doSearch = useCallback(async (q: string, p: string, pg: number) => {
    if (!q.trim()) return
    setLoading(true)
    const sp = new URLSearchParams({ q, page: String(pg), limit: '20' })
    if (p) sp.set('platform', p)
    const res = await fetch(`/api/search?${sp}`, { credentials: 'include' })
    const data = await res.json()
    if (data.success) { setResults(data.data); setTotal(data.total) }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (query) doSearch(query, platform, page)
  }, [query, platform, page, doSearch])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setQuery(input.trim())
    setPage(1)
    router.push(`/search?q=${encodeURIComponent(input.trim())}`, { scroll: false })
  }

  const totalPages = Math.ceil(total / 20)

  const formatHot = (v: number) => {
    if (!v) return ''
    if (v >= 1e8) return `${(v / 1e8).toFixed(1)}亿`
    if (v >= 1e4) return `${(v / 1e4).toFixed(0)}万`
    return v.toLocaleString()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 搜索头部 */}
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-orange-500" /> 搜索热点
          </h1>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input value={input} onChange={e => setInput(e.target.value)}
                placeholder="搜索全网热点标题..."
                className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
            </div>
            <select value={platform} onChange={e => { setPlatform(e.target.value); setPage(1) }}
              className="h-12 px-3 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 min-w-[100px]">
              <option value="">全部平台</option>
              {platforms.map(p => <option key={p.hashid} value={p.hashid}>{p.name}</option>)}
            </select>
            <button type="submit"
              className="h-12 px-6 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors flex-shrink-0">
              搜索
            </button>
          </form>
        </div>
      </div>

      {/* 搜索结果 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {query && (
          <p className="text-sm text-gray-500 mb-4">
            {loading ? '搜索中...' : `"${query}" 共找到 ${total.toLocaleString()} 条结果`}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : !query ? (
          <div className="text-center py-20 text-gray-400">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>输入关键词搜索全网热点</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">没有找到相关结果</p>
            <p className="text-sm mt-1">换个关键词试试？</p>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((item, i) => (
              <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all group">
                {/* 排名 */}
                <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                  (page - 1) * 20 + i < 3 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                }`}>{(page - 1) * 20 + i + 1}</span>

                {/* 缩略图 */}
                {item.thumbnail && (
                  <img src={item.thumbnail} alt="" className="w-16 h-12 rounded-lg object-cover flex-shrink-0" />
                )}

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium group-hover:text-orange-600 transition-colors line-clamp-2">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {/* 平台 logo */}
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      {item.platform_logo && (
                        <img src={item.platform_logo} alt="" className="w-3.5 h-3.5 rounded"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      )}
                      {item.platform_display || item.platform_name}
                    </span>
                    {item.hot_value > 0 && (
                      <span className="text-xs text-orange-500 font-medium">🔥 {formatHot(item.hot_value)}</span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(item.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>

                <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-orange-400 flex-shrink-0 mt-1" />
              </a>
            ))}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 px-3">第 {page} / {totalPages} 页</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
      <SearchContent />
    </Suspense>
  )
}
