'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Gift, Loader2, CheckCircle, XCircle, CreditCard, Zap } from 'lucide-react'

interface CreditInfo {
  balance: number
  totalPurchased: number
  totalUsed: number
}

// 按次计费：1分/次，量大优惠
const CREDIT_OPTIONS = [
  { amount: 100,   price: 1,    cents: 1,    perCall: '1.00',   label: '100 次',    desc: '¥1.00 / 100次 = 1分/次' },
  { amount: 500,   price: 4,    cents: 0.8,   perCall: '0.80',   label: '500 次',    desc: '¥4.00 / 500次 = 0.8分/次', hot: true },
  { amount: 1000,  price: 7,    cents: 0.7,   perCall: '0.70',   label: '1000 次',   desc: '¥7.00 / 1000次 = 0.7分/次' },
  { amount: 5000,  price: 28,   cents: 0.56,  perCall: '0.56',   label: '5000 次',   desc: '¥28.00 / 5000次 = 0.56分/次' },
  { amount: 10000,  price: 50,   cents: 0.5,   perCall: '0.50',   label: '10000 次',  desc: '¥50.00 / 10000次 = 0.5分/次', best: true },
]

export default function BillingPage() {
  const { user, isLoading } = useAuth()
  const [credits, setCredits] = useState<CreditInfo | null>(null)
  const [code, setCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [result, setResult] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  useEffect(() => {
    if (!user) return
    fetch('/api/user/subscription', { credentials: 'include' }).then(r => r.json()).then(d => {
      if (d.success) setCredits(d.data)
    })
  }, [user])

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setRedeeming(true); setResult(null)
    try {
      const res = await fetch('/api/user/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setResult({ type: 'ok', msg: data.message })
        setCode('')
        fetch('/api/user/subscription', { credentials: 'include' }).then(r => r.json()).then(d => {
        })
      } else {
        setResult({ type: 'err', msg: data.error })
      }
    } catch {
      setResult({ type: 'err', msg: '网络错误，请重试' })
    } finally {
      setRedeeming(false)
    }
  }

  if (isLoading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  )

  const used = credits?.totalUsed ?? 0
  const purchased = credits?.totalPurchased ?? 0
  const balance = credits?.balance ?? 0
  const usedPct = purchased > 0 ? Math.min(100, (used / purchased) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">充值中心</h1>
          <p className="text-sm text-gray-500 mt-1">
            按次计费：1 分钱 1 次调用 · 批量更优惠
          </p>
        </div>

        {/* 余额展示 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-orange-500" />
            <span className="text-5xl font-bold text-gray-900">{balance.toLocaleString()}</span>
            <span className="text-xl text-gray-400 font-medium">次</span>
          </div>
          <p className="text-sm text-gray-500">
            已消耗 {used.toLocaleString()} 次 / 共充值 {purchased.toLocaleString()} 次
          </p>
          {purchased > 0 && (
            <div className="mt-4 max-w-sm mx-auto">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${usedPct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{usedPct.toFixed(1)}% 已使用，剩余 {(purchased - used).toLocaleString()} 次</p>
            </div>
          )}
        </div>

        {/* 资费说明 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-3">📋 资费说明</h2>
          <div className="text-sm text-gray-600 space-y-1.5">
            <p>• <strong>1 分钱 = 1 次 API 调用</strong>（无每日限制）</p>
            <p>• 匿名用户每天 <strong>100 次</strong>免费额度（IP 级别）</p>
            <p>• 充值次数 <strong>永不过期</strong>，可随时使用</p>
            <p>• 批量购买，单价更低：买越多越便宜</p>
          </div>
        </div>

        {/* 充值档次 */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">💰 充值档次（1 分钱/次）</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CREDIT_OPTIONS.map(opt => (
              <div key={opt.amount}
                className={`bg-white rounded-xl border p-4 text-center relative transition-all ${
                  opt.best  ? 'border-orange-400 ring-2 ring-orange-200' :
                  opt.hot   ? 'border-blue-300 ring-1 ring-blue-200' :
                              'border-gray-200 hover:border-gray-300'
                }`}>
                {opt.best  && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs px-3 py-0.5 rounded-full">全网最低</span>}
                {opt.hot  && !opt.best && <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">推荐</span>}

                <p className="text-2xl font-bold text-gray-900 mt-1">{opt.amount.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mb-2">次</p>
                <p className="text-xl font-bold text-blue-600">¥{opt.price}</p>
                <p className="text-xs text-gray-400">≈ {opt.perCall} 分/次</p>
                <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 购买方式 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold text-gray-900">购买方式</h2>
          </div>

          <div className="space-y-3 text-sm text-gray-600 mb-6">
            <div className="flex gap-3">
              <span className="font-bold text-gray-900">①</span>
              <span>联系管理员（微信/支付宝）购买卡密</span>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-gray-900">②</span>
              <span>管理员生成对应面值的卡密发送给你</span>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-gray-900">③</span>
              <span>在下方输入卡密，充值到账</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              📧 admin@hotboard.com · 支持对公转账 · 企业可开票
            </p>
          </div>

          {/* 卡密兑换 */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="font-medium text-gray-900 mb-3">兑换卡密</h3>
            <form onSubmit={handleRedeem} className="flex gap-3">
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="输入卡密，如 HBC-XXXX-XXXX-XXXX-XXXX"
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-mono tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={28}
              />
              <button
                type="submit"
                disabled={redeeming || !code.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2 flex-shrink-0"
              >
                {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                兑换
              </button>
            </form>

            {result && (
              <div className={`mt-3 flex items-center gap-2 text-sm p-3 rounded-lg ${
                result.type === 'ok'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                {result.type === 'ok' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                {result.msg}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
