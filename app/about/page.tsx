import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '关于我们 - HotBoard',
  description: '了解 HotBoard 热榜聚合平台',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">H</div>
            <span className="font-bold text-gray-900">HotBoard</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">← 返回首页</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">关于 HotBoard</h1>
          <p className="text-lg text-gray-600">一站式热点追踪服务，聚合全网热门内容</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">我们是谁</h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            HotBoard 是一个开源的热榜聚合平台，致力于为用户提供最便捷的全网热点追踪体验。
            我们聚合了微博、知乎、抖音、B站、GitHub 等 19+ 热门平台，实时更新，让你不漏掉任何重要信息。
          </p>
          <p className="text-gray-600 leading-relaxed">
            无论是科技从业者、媒体从业者，还是对热点事件感兴趣的普通用户，HotBoard 都能帮助你在一个地方掌握全网动态。
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">核心功能</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: '多平台聚合', desc: '覆盖综合、视频、新闻、科技、影视、国际 6 大分类，共 19+ 平台' },
              { title: '实时更新', desc: '每小时自动抓取最新数据，确保你看到的都是实时热点' },
              { title: 'API 接口', desc: '为开发者提供 RESTful API，支持按套餐配额调用' },
              { title: '跨平台搜索', desc: '支持关键词跨平台搜索，快速定位目标热点' },
              { title: '收藏与历史', desc: '登录用户可收藏感兴趣的内容，并查看浏览历史' },
              { title: '卡密充值', desc: '支持卡密充值，绕过支付限制，适合企业采购' },
            ].map(f => (
              <div key={f.title} className="p-5 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">技术架构</h2>
          <div className="space-y-3">
            {[
              ['前端', 'Next.js 14 + React 18 + TypeScript + Tailwind CSS'],
              ['后端', 'Next.js API Routes + PostgreSQL'],
              ['数据抓取', '原生 HTTP 请求，支持 Ajax API / 官方 API / RSS 三种方式'],
              ['部署', 'Docker Compose 一键部署，支持 Nginx 反向代理'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-4">
                <span className="w-20 flex-shrink-0 text-sm font-medium text-gray-500">{k}</span>
                <span className="text-gray-700 text-sm">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors">
            立即体验 →
          </Link>
        </div>
      </div>
    </div>
  )
}
