/**
 * 平台热点卡片组件
 * 显示平台名称、真实Logo和最新热点数据列表
 * 卡片等高，内容尽量填充满
 */

'use client'

import Link from 'next/link'
import { Flame, TrendingUp, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Node } from '@/types'

const PLATFORM_CONFIG: Record<string, {
  color: string
  bgColor: string
  borderColor: string
  logoUrl: string
  fallbackIcon: string
}> = {
  'baidu-hot':    { color: 'text-blue-600',  bgColor: 'bg-blue-50',   borderColor: 'border-blue-100',  logoUrl: 'https://www.baidu.com/favicon.ico', fallbackIcon: '🔍' },
  'bilibili-hot': { color: 'text-pink-500',  bgColor: 'bg-pink-50',   borderColor: 'border-pink-100',  logoUrl: 'https://www.bilibili.com/favicon.ico', fallbackIcon: '📺' },
  'weibo-hot':    { color: 'text-orange-500',bgColor: 'bg-orange-50', borderColor: 'border-orange-100',logoUrl: 'https://weibo.com/favicon.ico', fallbackIcon: '📱' },
  'zhihu-hot':    { color: 'text-blue-500',  bgColor: 'bg-blue-50',   borderColor: 'border-blue-100',  logoUrl: 'https://static.zhihu.com/heifetz/favicon.ico', fallbackIcon: '💡' },
  'douyin-hot':   { color: 'text-gray-900',  bgColor: 'bg-gray-50',   borderColor: 'border-gray-200',  logoUrl: 'https://lf1-cdn-tos.bytegoofy.com/goofy/ies/douyin_web/public/favicon.ico', fallbackIcon: '🎵' },
  'douban-movie': { color: 'text-green-600', bgColor: 'bg-green-50',  borderColor: 'border-green-100', logoUrl: 'https://img3.doubanio.com/favicon.ico', fallbackIcon: '🎬' },
  'thepaper-hot': { color: 'text-red-600',   bgColor: 'bg-red-50',    borderColor: 'border-red-100',   logoUrl: 'https://www.thepaper.cn/favicon.ico', fallbackIcon: '📰' },
  'hn-hot':       { color: 'text-orange-600',bgColor: 'bg-orange-50', borderColor: 'border-orange-100',logoUrl: 'https://news.ycombinator.com/favicon.ico', fallbackIcon: '⚡' },
  '36kr-hot':     { color: 'text-blue-700',  bgColor: 'bg-blue-50',   borderColor: 'border-blue-100',  logoUrl: 'https://36kr.com/favicon.ico', fallbackIcon: '💼' },
  'juejin-hot':   { color: 'text-blue-500',  bgColor: 'bg-blue-50',   borderColor: 'border-blue-100',  logoUrl: 'https://lf-web-assets.juejin.cn/obj/juejin-web/xitu_juejin_web/static/favicons/favicon-32x32.png', fallbackIcon: '💎' },
  'toutiao-hot':  { color: 'text-red-500',   bgColor: 'bg-red-50',    borderColor: 'border-red-100',   logoUrl: 'https://www.toutiao.com/favicon.ico', fallbackIcon: '📡' },
  'sspai-hot':    { color: 'text-red-500',   bgColor: 'bg-red-50',    borderColor: 'border-red-100',   logoUrl: 'https://sspai.com/favicon.ico', fallbackIcon: '✨' },
  'tencent-hot':  { color: 'text-blue-600',  bgColor: 'bg-blue-50',   borderColor: 'border-blue-100',  logoUrl: 'https://mat1.gtimg.com/www/icon/favicon2.ico', fallbackIcon: '📰' },
  'people-hot':   { color: 'text-red-700',   bgColor: 'bg-red-50',    borderColor: 'border-red-100',   logoUrl: 'http://www.people.com.cn/favicon.ico', fallbackIcon: '🗞️' },
  'xinhua-hot':   { color: 'text-red-600',   bgColor: 'bg-red-50',    borderColor: 'border-red-100',   logoUrl: 'https://www.xinhuanet.com/favicon.ico', fallbackIcon: '📡' },
  'v2ex-hot':       { color: 'text-gray-700',  bgColor: 'bg-gray-50',   borderColor: 'border-gray-200',  logoUrl: 'https://www.v2ex.com/favicon.ico',  fallbackIcon: '🌐' },
  'github-trending':{ color: 'text-gray-900',  bgColor: 'bg-gray-50',   borderColor: 'border-gray-200',  logoUrl: 'https://github.com/favicon.ico',    fallbackIcon: '🐙' },
  'devto-hot':      { color: 'text-indigo-600',bgColor: 'bg-indigo-50', borderColor: 'border-indigo-100',logoUrl: 'https://dev.to/favicon.ico',         fallbackIcon: '👩‍💻' },
  'lobsters-hot':   { color: 'text-red-600',   bgColor: 'bg-red-50',    borderColor: 'border-red-100',   logoUrl: 'https://lobste.rs/favicon.ico',      fallbackIcon: '🦞' },
  'hn-best':        { color: 'text-orange-600',bgColor: 'bg-orange-50', borderColor: 'border-orange-100',logoUrl: 'https://news.ycombinator.com/favicon.ico', fallbackIcon: '⚡' },
}

const DEFAULT_CONFIG = {
  color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200',
  logoUrl: '', fallbackIcon: '📊',
}

interface NodeCardProps {
  node: Node
  className?: string
}

export default function NodeCard({ node, className }: NodeCardProps) {
  const platform = PLATFORM_CONFIG[node.hashid] || DEFAULT_CONFIG
  const items = node.items || []
  // 根据数据量决定显示条数：数据多显示10条，少的全显示
  const displayCount = items.length >= 10 ? 10 : items.length
  const topItems = items.slice(0, displayCount)
  const hasItems = topItems.length > 0

  return (
    <Link
      href={`/n/${node.hashid}`}
      className={cn(
        'flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden',
        'hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 group',
        'h-full',   // 撑满格子高度
        className
      )}
    >
      {/* 卡片头部 */}
      <div className={cn(
        'px-4 py-3 border-b flex items-center justify-between flex-shrink-0',
        platform.bgColor, platform.borderColor
      )}>
        <div className="flex items-center gap-2.5">
          <PlatformLogo logoUrl={node.logo || platform.logoUrl} fallback={platform.fallbackIcon} name={node.name} />
          <div>
            <h3 className={cn('font-bold text-sm leading-tight', platform.color)}>
              {node.displayName || node.name}
            </h3>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" />
              {node.itemsCount || 0} 条热点
            </p>
          </div>
        </div>
        <div className="text-gray-300 group-hover:text-blue-400 transition-colors">
          <ExternalLink className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* 热点列表 — flex-1 撑满剩余空间 */}
      <div className="flex-1 px-3 py-2 overflow-hidden">
        {hasItems ? (
          <ul className="h-full flex flex-col justify-between">
            {topItems.map((item, index) => (
              <li key={item.id} className="flex items-center gap-2 py-1 group/item border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                {/* 排名 */}
                <span className={cn(
                  'flex-shrink-0 w-5 h-5 rounded text-xs font-bold flex items-center justify-center',
                  index === 0 ? 'bg-red-500 text-white' :
                  index === 1 ? 'bg-orange-400 text-white' :
                  index === 2 ? 'bg-yellow-400 text-white' :
                  'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                )}>
                  {index + 1}
                </span>

                {/* 标题 — 点击跳转到平台详情页 */}
                <Link
                  href={`/n/${node.hashid}?highlight=${encodeURIComponent(item.title)}`}
                  className="flex-1 min-w-0 text-xs text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors leading-tight line-clamp-2"
                  title={item.title}
                >
                  {item.title}
                </Link>

                {/* 热度 */}
                {(item.hotValue ?? 0) > 0 && (
                  <span className="flex-shrink-0 flex items-center gap-0.5 text-xs text-gray-300 dark:text-gray-600 ml-1">
                    <Flame className="w-2.5 h-2.5 text-orange-300" />
                    <span className="hidden sm:inline">{formatHotValue(item.hotValue ?? 0)}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">暂无热点数据</div>
        )}
      </div>

      {/* 底部 */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
        <span className="text-xs text-gray-400">
          {hasItems
            ? `更新于 ${formatTime(node.updatedAt || '')}`
            : '暂无数据'}
        </span>
        <span className="text-xs text-blue-500 font-medium group-hover:underline">查看全部 →</span>
      </div>
    </Link>
  )
}

function PlatformLogo({ logoUrl, fallback, name }: { logoUrl: string; fallback: string; name: string }) {
  if (!logoUrl) {
    return (
      <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center text-lg flex-shrink-0">
        {fallback}
      </div>
    )
  }
  return (
    <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center flex-shrink-0 overflow-hidden">
      <img
        src={logoUrl}
        alt={name}
        className="w-6 h-6 object-contain"
        loading="lazy"
        onError={(e) => {
          const parent = e.currentTarget.parentElement
          if (parent) parent.innerHTML = `<span class="text-lg">${fallback}</span>`
        }}
      />
    </div>
  )
}

function formatHotValue(value: number): string {
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}亿`
  if (value >= 10000) return `${(value / 10000).toFixed(0)}万`
  return value.toLocaleString()
}

function formatTime(dateString: string): string {
  if (!dateString) return ''
  try {
    // 数据库时间是 UTC，直接和当前 UTC 时间比较
    const date = new Date(dateString)
    const now = new Date()
    // 都转为 UTC 毫秒数
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins}分钟前`
    const hours = Math.floor(diff / 3600000)
    if (hours < 24) return `${hours}小时前`
    return `${Math.floor(diff / 86400000)}天前`
  } catch { return '' }
}
