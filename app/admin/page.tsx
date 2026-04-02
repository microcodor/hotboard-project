'use client'
import { useEffect, useState } from 'react'
import { Users, Layers, Key, Activity, TrendingUp, Zap, Loader2 } from 'lucide-react'

interface Stats {
  users: { total: number; today: number }
  platforms: { total: number; active: number }
  items: { total: number; today: number }
  cards: { unused: number; used: number; disabled: number }
  subscriptions: Record<string, number>
  trend: { date: string; count: number }[]
  topPlatforms: { hashid: string; count: number }[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(d => {
      if (d.success) setStats(d.stats)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  )

  const Card = ({ icon: Icon, label, value, sub }: any) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value?.toLocaleString()}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
        <p className="text-sm text-gray-500 mt-1">HotBoard 数据概览</p>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={Users} label="总用户" value={stats?.users.total} sub={`今日 +${stats?.users.today}`} />
        <Card icon={Layers} label="平台数" value={stats?.platforms.total} sub={`${stats?.platforms.active} 个活跃`} />
        <Card icon={Activity} label="热点总数" value={stats?.items.total} sub={`今日 +${stats?.items.today}`} />
        <Card icon={Key} label="卡密" value={stats?.cards.unused} sub={`已使用 ${stats?.cards.used}`} />
      </div>

      {/* 套餐分布 & 趋势 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 套餐分布 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">套餐分布</h2>
          <div className="space-y-3">
            {[
              { name: '免费版', slug: 'free', color: 'bg-gray-500' },
              { name: '基础版', slug: 'basic', color: 'bg-blue-500' },
              { name: '专业版', slug: 'pro', color: 'bg-purple-500' },
              { name: '企业版', slug: 'enterprise', color: 'bg-amber-500' },
            ].map(p => {
              const count = stats?.subscriptions[p.slug] || 0
              const total = Object.values(stats?.subscriptions || {}).reduce((a: any, b: any) => a + b, 0)
              const pct = total ? Math.round(count / total * 100) : 0
              return (
                <div key={p.slug}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{p.name}</span>
                    <span className="font-medium">{count} 人</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${p.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 今日 Top 平台 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">今日数据增量 Top 5</h2>
          <div className="space-y-3">
            {stats?.topPlatforms.length === 0 ? (
              <p className="text-gray-400 text-sm">暂无数据</p>
            ) : stats?.topPlatforms.map((p, i) => (
              <div key={p.hashid} className="flex items-center gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span className="flex-1 text-gray-700 text-sm font-medium">{p.hashid}</span>
                <span className="text-gray-500 text-sm">+{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 近7天趋势 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          近7天数据抓取趋势
        </h2>
        <div className="h-40 flex items-end gap-1">
          {stats?.trend.map((d, i) => {
            const max = Math.max(...(stats.trend.map(t => t.count)), 1)
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                  style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                  title={`${d.count} 条`}
                />
                <span className="text-xs text-gray-400">{new Date(d.date).getDate()}日</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
