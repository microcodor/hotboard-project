'use client'
import { useState, useEffect, useCallback } from 'react'
import { Play, Loader2, CheckCircle, XCircle, Clock, Settings, Save, X, Plus, Trash2, Globe } from 'lucide-react'

interface CrawlLog {
  id: number; platform: string; status: string; items_count: number
  error_message: string | null; started_at: string; finished_at: string
}

interface ScheduleEntry {
  id: string
  expr: string
  tz: string
  enabled: boolean
  label?: string
}

interface WorkerStatus {
  status: string
  isRunning: boolean
  lastResult: any
  uptime: number
}

const PRESETS = [
  { label: '每小时整点', expr: '0 * * * *' },
  { label: '每 2 小时', expr: '0 */2 * * *' },
  { label: '每天 8 点', expr: '0 8 * * *' },
  { label: '每天 8/12/18 点', expr: '0 8,12,18 * * *' },
  { label: '每天 9-22 点每 3 小时', expr: '0 9-22/3 * * *' },
  { label: '每周一 9 点', expr: '0 9 * * 1' },
]

const TIMEZONES = [
  { value: 'Asia/Shanghai', label: '🇨🇳 北京时间 (Asia/Shanghai)' },
  { value: 'UTC', label: '🌍 UTC' },
  { value: 'America/New_York', label: '🇺🇸 美东时间' },
  { value: 'Europe/London', label: '🇬🇧 伦敦时间' },
]

export default function AdminCrawlPage() {
  const [logs, setLogs] = useState<CrawlLog[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([])
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [localSchedules, setLocalSchedules] = useState<ScheduleEntry[]>([])
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [scheduleError, setScheduleError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/crawl')
    const data = await res.json()
    if (data.success) setLogs(data.data || [])
    setLoading(false)
  }, [])

  const loadSchedule = useCallback(async () => {
    const res = await fetch('/api/admin/crawl-schedule')
    const data = await res.json()
    if (data.success) {
      setSchedules(data.data?.schedules || [])
      setLocalSchedules(data.data?.schedules || [])
    }
  }, [])

  useEffect(() => {
    load()
    loadSchedule()
  }, [load, loadSchedule])

  const triggerCrawl = async () => {
    setTriggering(true)
    await fetch('/api/admin/crawl', { method: 'POST' })
    setTimeout(() => { setTriggering(false); load() }, 5000)
  }

  const saveSchedule = async () => {
    setScheduleError('')
    setSavingSchedule(true)
    try {
      const res = await fetch('/api/admin/crawl-schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules: localSchedules }),
      })
      const data = await res.json()
      if (data.success) {
        setSchedules(localSchedules)
        setShowScheduleModal(false)
      } else {
        setScheduleError(data.error || '保存失败')
      }
    } catch (e: any) {
      setScheduleError(e.message)
    } finally {
      setSavingSchedule(false)
    }
  }

  const addSchedule = () => {
    setLocalSchedules(s => [...s, {
      id: `s-${Date.now()}`,
      expr: '0 * * * *',
      tz: 'Asia/Shanghai',
      enabled: true,
      label: '',
    }])
  }

  const removeSchedule = (id: string) => {
    setLocalSchedules(s => s.filter(s => s.id !== id))
  }

  const updateSchedule = (id: string, field: string, value: any) => {
    setLocalSchedules(s => s.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const applyPreset = (id: string, expr: string) => {
    setLocalSchedules(s => s.map(item =>
      item.id === id ? { ...item, expr } : item
    ))
  }

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'running') return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />
    if (status === 'success') return <CheckCircle className="w-4 h-4 text-green-500" />
    return <XCircle className="w-4 h-4 text-red-500" />
  }

  const formatTime = (ms: number) => {
    if (!ms) return '-'
    const date = new Date(ms)
    return date.toLocaleString('zh-CN', { 
      timeZone: 'Asia/Shanghai',
      month: '2-digit', day: '2-digit', 
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false 
    })
  }

  // 相对时间
  const formatRelative = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diff < 60) return '刚刚'
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
    return formatTime(date.getTime())
  }

  const getNextRunTime = () => {
    if (schedules.length === 0) return '未配置'
    const now = new Date()
    const next = new Date(now.getTime() + 60 * 60 * 1000)
    next.setMinutes(0)
    next.setSeconds(0)
    next.setMilliseconds(0)
    const beijingHour = parseInt(next.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour: 'numeric', hour12: false }))
    const beijingMin = parseInt(next.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', minute: 'numeric' }))
    return `约 ${beijingHour} 点${beijingMin > 0 ? beijingMin + '分' : ''}`
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">抓取任务</h1>
          <p className="text-sm text-gray-500 mt-1">查看抓取历史、手动触发任务和定时配置</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setLocalSchedules(schedules); setShowScheduleModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Settings className="w-4 h-4" />
            定时配置
          </button>
          <button onClick={triggerCrawl} disabled={triggering}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            {triggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {triggering ? '执行中...' : '立即抓取全量'}
          </button>
        </div>
      </div>

      {/* Worker 状态指示器 */}
      {workerStatus && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${workerStatus.isRunning ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`} />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Worker 调度器 {workerStatus.isRunning ? '🔄 执行中' : '✅ 运行正常'}
              </p>
              <p className="text-xs text-gray-500">
                已运行 {Math.round(workerStatus.uptime / 60)} 分钟
                {workerStatus.lastResult?.totalItems ? ` · 最近抓取 ${workerStatus.lastResult.totalItems} 条数据` : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 定时配置面板 */}
      {schedules.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              定时抓取配置
            </h3>
            <button onClick={() => setShowScheduleModal(true)}
              className="text-sm text-blue-600 hover:text-blue-700">
              编辑配置
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map((s, i) => (
              <div key={s.id} className={`bg-white rounded-lg border p-4 ${s.enabled ? 'border-green-200' : 'border-gray-200 opacity-60'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{s.label || `方案 ${i + 1}`}</span>
                  <span className={`text-xs px-2 py-1 rounded ${s.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.enabled ? '已启用' : '已禁用'}
                  </span>
                </div>
                <p className="text-lg font-mono font-bold text-gray-900">{s.expr}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <Globe className="w-3 h-3" />
                  {TIMEZONES.find(t => t.value === s.tz)?.label.split(' ')[0] || s.tz}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium">下次执行：</span>
              {getNextRunTime()}
            </p>
          </div>
        </div>
      )}

      {schedules.length === 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">暂未配置定时任务</p>
          <button onClick={() => setShowScheduleModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            配置定时任务
          </button>
        </div>
      )}

      {/* 定时配置弹窗 */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full my-8 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">定时配置</h2>
              <button onClick={() => setShowScheduleModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {scheduleError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {scheduleError}
              </div>
            )}

            {/* 预设快捷选项 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">快捷预设</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button key={p.label} onClick={() => {
                    // 应用到所有启用的配置
                    setLocalSchedules(s => s.map(item =>
                      item.enabled ? { ...item, expr: p.expr } : item
                    ))
                  }}
                    className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:text-blue-600">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 定时列表 */}
            <div className="space-y-4">
              {localSchedules.map((s, i) => (
                <div key={s.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={s.enabled}
                        onChange={(e) => updateSchedule(s.id, 'enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                      <input
                        type="text"
                        value={s.label || ''}
                        onChange={(e) => updateSchedule(s.id, 'label', e.target.value)}
                        placeholder={`方案 ${i + 1}`}
                        className="text-sm font-medium border-none bg-transparent focus:outline-none"
                      />
                    </div>
                    <button onClick={() => removeSchedule(s.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={s.expr}
                      onChange={(e) => updateSchedule(s.id, 'expr', e.target.value)}
                      placeholder="0 * * * *"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={s.tz}
                      onChange={(e) => updateSchedule(s.id, 'tz', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {TIMEZONES.map(tz => (
                        <option key={tz.value} value={tz.value}>{tz.label.split(' ')[1]}</option>
                      ))}
                    </select>
                  </div>

                  {/* 预设快捷应用到当前 */}
                  <div className="flex gap-1">
                    {PRESETS.slice(0, 4).map((p) => (
                      <button key={p.label} onClick={() => applyPreset(s.id, p.expr)}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 添加按钮 */}
            <button onClick={addSchedule}
              className="flex items-center gap-2 w-full justify-center py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600">
              <Plus className="w-4 h-4" />
              添加定时方案
            </button>

            <div className="flex gap-3 pt-4 border-t">
              <button onClick={() => setShowScheduleModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
                取消
              </button>
              <button onClick={saveSchedule} disabled={savingSchedule}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                {savingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingSchedule ? '保存中...' : '保存配置'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 抓取日志表格 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">平台</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">数据量</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">错误信息</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">暂无抓取记录</td></tr>
              ) : logs.slice(0, 30).map(log => {
                const platform = (log as any).platform || (log as any).node_hashid || ''
                const startedAt = (log as any).started_at || (log as any).created_at || ''
                const errorMsg = (log as any).error_message || ''
                const statusLabel = log.status === 'success' ? '✅ 新增' : log.status === 'updated' ? '🔄 更新' : log.status === 'no_change' ? '➖ 无变化' : log.status
                const platformMap: Record<string, string> = {
                  'weibo-hot': '微博', 'zhihu-hot': '知乎', 'toutiao-hot': '头条',
                  'juejin-hot': '掘金', 'douyin-hot': '抖音', 'sspai-hot': '少数派',
                  '36kr-hot': '36氪', 'tencent-hot': '腾讯新闻', 'people-hot': '人民日报',
                  'xinhua-hot': '新华社', 'github-trending': 'GitHub', 'devto-hot': 'Dev.to',
                  'lobsters-hot': 'Lobsters', 'hn-best': 'HN Best', 'baidu-hot': '百度',
                  'bilibili-hot': 'B站', 'douban-movie': '豆瓣', 'thepaper-hot': '澎湃',
                  'hn-hot': 'HN'
                }
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs">
                      <span className="font-mono">{platform}</span>
                      <span className="text-gray-400 ml-1">{platformMap[platform] || ''}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <StatusIcon status={log.status} />
                        <span className="text-xs">{statusLabel}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">{log.items_count || 0} 条</td>
                    <td className="px-4 py-3 text-red-500 text-xs max-w-xs truncate">{errorMsg || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs" title={startedAt ? formatTime(new Date(startedAt).getTime()) : '-'}>
                      {formatRelative(startedAt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
