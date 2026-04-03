import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'API 文档 - HotBoard',
  description: 'HotBoard 热榜聚合 API 接口文档',
}

// 对外公开接口（需要 API Key 鉴权）
const ENDPOINTS = [
  {
    method: 'GET', path: '/api/platforms',
    desc: '获取所有支持的新闻平台列表（无需鉴权）',
    params: [],
    response: `{ success: true, data: [{ id, name, displayName, category, url, itemsCount, updatedAt }], total }`,
  },
  {
    method: 'GET', path: '/api/feeds?platform=xxx',
    desc: '根据平台 ID 获取该平台的热点列表（按排名排序）',
    params: ['platform=平台ID（必填，如 toutiao-hot）', 'limit=每页数量(默认50, 最大100)', 'offset=偏移量(默认0)'],
    response: `{ success: true, platform: { id, name, displayName, category }, data: [{ id, title, url, hotValue, rank, ... }], total, hasMore }`,
  },
  {
    method: 'GET', path: '/api/nodes',
    desc: '按抓取时间倒序返回所有平台的最新热点（跨平台混合列表）',
    params: ['limit=每页数量(默认20, 最大100)', 'offset=偏移量(默认0)'],
    response: `{ success: true, data: [{ id, title, url, hotValue, rank, createdAt, platform: { id, name, category } }], total, hasMore }`,
  },
]

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">H</div>
            <span className="font-bold text-gray-900">HotBoard</span>
            <span className="text-sm text-gray-500">API 文档</span>
          </Link>
          <Link href="/user/billing" className="text-sm text-blue-600 hover:text-blue-700">获取 API Key →</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">HotBoard API</h1>
          <p className="text-lg text-gray-600 mb-6">
            简单易用的热榜聚合 API，支持 19+ 平台，实时更新。
          </p>
          <div className="flex gap-3 flex-wrap">
            <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">REST API</span>
            <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">JSON 响应</span>
            <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">API Key 鉴权</span>
          </div>
        </div>

        {/* Base URL */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">接口地址</h2>
          <div className="bg-gray-900 rounded-xl p-5 font-mono text-sm">
            <p className="text-yellow-300">https://hotboard.app</p>
          </div>
          <p className="text-sm text-gray-500 mt-2">如部署在本地： http://192.168.2.133:3000</p>
        </section>

        {/* 认证方式 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">认证方式</h2>
          <p className="text-gray-600 mb-4">
            在请求头或 Query 参数中传入 <code className="bg-gray-100 px-2 py-1 rounded text-sm">api_key</code> 即可完成认证。
          </p>
          <div className="bg-gray-900 rounded-xl p-5 font-mono text-sm text-gray-100 space-y-3">
            <p className="text-green-400">// Header 方式（推荐）</p>
            <p className="text-yellow-300">Authorization: Bearer <span className="text-white">hb_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</span></p>
            <div className="border-t border-gray-700 pt-3 mt-3">
              <p className="text-gray-400">// Query 参数方式</p>
              <p className="text-yellow-300">GET /api/nodes?<span className="text-white">api_key</span>=<span className="text-white">hb_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</span></p>
            </div>
          </div>
          <div className="mt-4 bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              💡 <strong>免费额度：</strong>未认证用户每天 100 次，认证用户根据余额不限量使用。
            </p>
          </div>
        </section>

        {/* 接口列表 */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">API 接口</h2>
          <div className="space-y-4">
            {ENDPOINTS.map(endpoint => (
              <div key={endpoint.path} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start gap-3 mb-3">
                  <span className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">
                    {endpoint.method}
                  </span>
                  <code className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-0.5 rounded">
                    {endpoint.path}
                  </code>
                </div>
                <p className="text-sm text-gray-600 mb-3">{endpoint.desc}</p>
                {endpoint.params && (
                  <div className="mb-3">
                    <span className="text-xs text-gray-400 font-medium">参数：</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {endpoint.params.map(p => (
                        <code key={p} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono">{p}</code>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-xs text-gray-400 font-medium">响应示例：</span>
                  <pre className="mt-1 text-xs bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto">
                    {endpoint.response}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 错误码 */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">错误响应</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {[
              { code: 400, msg: '请求参数错误', color: 'text-orange-600' },
              { code: 401, msg: 'API Key 无效或未提供', color: 'text-red-600' },
              { code: 402, msg: '余额不足，请充值', color: 'text-red-600' },
              { code: 404, msg: '平台不存在', color: 'text-orange-600' },
              { code: 429, msg: '请求过于频繁，请稍后再试', color: 'text-orange-600' },
              { code: 500, msg: '服务器内部错误', color: 'text-red-600' },
            ].map(e => (
              <div key={e.code} className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 last:border-0">
                <span className={`font-mono font-bold w-12 ${e.color}`}>{e.code}</span>
                <span className="text-sm text-gray-600">{e.msg}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 获取 API Key */}
        <section className="mt-12 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 p-6">
          <h2 className="text-lg font-bold text-orange-900 mb-2">获取 API Key</h2>
          <p className="text-sm text-orange-700 mb-4">
            注册账号后即可获得 API Key，可免费使用。余额不足时请充值。
          </p>
          <div className="flex gap-3">
            <Link href="/register" className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium">
              立即注册
            </Link>
            <Link href="/login" className="px-4 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 text-sm font-medium">
              登录账号
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
