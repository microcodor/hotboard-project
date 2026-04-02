'use client'
import { useState, useMemo } from 'react'
import { Search, BookOpen, ExternalLink, Copy, Check } from 'lucide-react'

interface Platform {
  id: string
  name: string
  category: string
  dataSource: string
  updateFreq: string
  itemCount: number
  difficulty: number
  description: string
  apiEndpoint?: string
  method?: string
  timeout?: string
  features: string[]
  example: any
}

const PLATFORMS: Platform[] = [
  {
    id: 'weibo',
    name: '微博热搜',
    category: '社交媒体',
    dataSource: '官方 API',
    updateFreq: '实时',
    itemCount: 50,
    difficulty: 1,
    description: '微博官方热搜排行榜，实时更新，包含热度值和标签',
    apiEndpoint: 'https://weibo.com/ajax/side/hotSearch',
    method: 'GET',
    timeout: '10 秒',
    features: ['官方 API', '实时更新', '无需登录', '稳定可靠'],
    example: { title: '春节返工潮', hot_value: 2500000, rank: 1 },
  },
  {
    id: 'zhihu',
    name: '知乎热榜',
    category: '问答社区',
    dataSource: '官方 API',
    updateFreq: '实时',
    itemCount: 50,
    difficulty: 1,
    description: '知乎热门问题排行榜，包含问题摘要和热度值',
    apiEndpoint: 'https://www.zhihu.com/api/v4/creators/rank/hot',
    method: 'GET',
    timeout: '10 秒',
    features: ['官方 API', '数据准确', '包含摘要', '包含缩略图'],
    example: { title: '如何看待 2026 年的技术趋势？', hot_value: 150000, rank: 1 },
  },
  {
    id: 'toutiao',
    name: '头条热榜',
    category: '新闻资讯',
    dataSource: '官方网页',
    updateFreq: '实时',
    itemCount: 50,
    difficulty: 1,
    description: '头条热点排行榜，数据量大，更新快',
    apiEndpoint: 'https://www.toutiao.com/hot-event/hot-board/',
    method: 'GET',
    timeout: '10 秒',
    features: ['数据量大', '更新快', '包含图片', '热度值准确'],
    example: { title: '国务院发布新政策', hot_value: 500000, rank: 1 },
  },
  {
    id: 'juejin',
    name: '掘金热榜',
    category: '开发者社区',
    dataSource: '官方 API',
    updateFreq: '实时',
    itemCount: 10,
    difficulty: 2,
    description: '掘金开发者社区热门文章，内容质量高',
    apiEndpoint: 'https://api.juejin.cn/recommend_api/v1/article/recommend_cate_feed',
    method: 'POST',
    timeout: '10 秒',
    features: ['内容质量高', '开发者社区', '官方 API', '需要 POST'],
    example: { title: '深入理解 React 18 并发特性', hot_value: 5000, rank: 1 },
  },
  {
    id: 'douyin',
    name: '抖音热点',
    category: '短视频',
    dataSource: '官方网页',
    updateFreq: '实时',
    itemCount: 50,
    difficulty: 3,
    description: '抖音热点排行榜，需要 JavaScript 渲染',
    method: 'JS 渲染',
    timeout: '15 秒',
    features: ['数据新鲜', '更新快', '需要 JS 渲染', '包含视频'],
    example: { title: '春节回家的故事', hot_value: 1000000, rank: 1 },
  },
  {
    id: 'sspai',
    name: '少数派',
    category: '科技博客',
    dataSource: 'RSS 源',
    updateFreq: '每小时',
    itemCount: 10,
    difficulty: 1,
    description: '少数派 RSS 源，稳定可靠，解析简单',
    apiEndpoint: 'https://sspai.com/feed',
    method: 'GET',
    timeout: '10 秒',
    features: ['RSS 源稳定', '无需 JS 渲染', '解析简单', '更新频率低'],
    example: { title: '如何高效使用 Mac 快捷键', hot_value: 100, rank: 1 },
  },
  {
    id: '36kr',
    name: '36氪',
    category: '创业资讯',
    dataSource: '官方网页',
    updateFreq: '实时',
    itemCount: 20,
    difficulty: 2,
    description: '36氪创业资讯平台，内容专业',
    method: 'HTML 解析',
    timeout: '10 秒',
    features: ['创业资讯', '内容专业', '更新频率高', '可能有反爬虫'],
    example: { title: 'AI 创业公司融资 1 亿美元', hot_value: 500, rank: 1 },
  },
  {
    id: 'tencent-news',
    name: '腾讯新闻',
    category: '新闻资讯',
    dataSource: '官方 API',
    updateFreq: '实时',
    itemCount: 30,
    difficulty: 1,
    description: '腾讯新闻权威排行榜，更新快',
    method: 'GET',
    timeout: '10 秒',
    features: ['新闻权威', '更新快', '包含图片', '官方 API'],
    example: { title: '国务院召开常务会议', hot_value: 1000, rank: 1 },
  },
  {
    id: 'people-daily',
    name: '人民日报',
    category: '新闻资讯',
    dataSource: '官方网页',
    updateFreq: '每天',
    itemCount: 30,
    difficulty: 2,
    description: '人民日报权威新闻源，内容质量高',
    method: 'HTML 解析',
    timeout: '10 秒',
    features: ['权威新闻', '内容质量高', '更新频率低', '页面结构复杂'],
    example: { title: '中央经济工作会议召开', hot_value: 800, rank: 1 },
  },
  {
    id: 'xinhua',
    name: '新华社',
    category: '新闻资讯',
    dataSource: '官方网页',
    updateFreq: '实时',
    itemCount: 30,
    difficulty: 2,
    description: '新华社权威新闻源，更新频率高',
    method: 'HTML 解析',
    timeout: '10 秒',
    features: ['权威新闻', '更新频率高', '内容质量高', '页面结构可能变化'],
    example: { title: '习近平主席发表新年贺词', hot_value: 1000, rank: 1 },
  },
  {
    id: 'github-trending',
    name: 'GitHub Trending',
    category: '开源项目',
    dataSource: '官方网页',
    updateFreq: '每天',
    itemCount: 25,
    difficulty: 1,
    description: '开源项目权威排行榜，数据准确',
    apiEndpoint: 'https://github.com/trending',
    method: 'HTML 解析',
    timeout: '10 秒',
    features: ['开源项目权威', '数据准确', '无需登录', '更新频率低'],
    example: { title: 'openai/gpt-4-turbo', hot_value: 5000, rank: 1 },
  },
  {
    id: 'devto',
    name: 'Dev.to',
    category: '开发者社区',
    dataSource: '官方 API',
    updateFreq: '实时',
    itemCount: 25,
    difficulty: 1,
    description: '开发者社区，内容优质',
    apiEndpoint: 'https://dev.to/api/articles',
    method: 'GET',
    timeout: '10 秒',
    features: ['内容优质', '官方 API', '无需登录', '英文内容为主'],
    example: { title: 'Understanding React Hooks', hot_value: 500, rank: 1 },
  },
  {
    id: 'lobsters',
    name: 'Lobsters',
    category: '技术社区',
    dataSource: '官方网页',
    updateFreq: '实时',
    itemCount: 25,
    difficulty: 1,
    description: '技术社区，内容专业',
    method: 'HTML 解析',
    timeout: '10 秒',
    features: ['技术社区', '内容专业', '更新频率高', '英文内容为主'],
    example: { title: 'The State of WebAssembly 2026', hot_value: 200, rank: 1 },
  },
  {
    id: 'hn-best',
    name: 'HN Best',
    category: '技术社区',
    dataSource: '官方网页',
    updateFreq: '实时',
    itemCount: 25,
    difficulty: 1,
    description: '技术社区权威排行，内容质量高',
    apiEndpoint: 'https://news.ycombinator.com/best',
    method: 'HTML 解析',
    timeout: '10 秒',
    features: ['权威排行', '内容质量高', '更新频率低', '英文内容为主'],
    example: { title: 'Show HN: A new approach to distributed systems', hot_value: 500, rank: 1 },
  },
  {
    id: 'baidu',
    name: '百度热搜',
    category: '搜索引擎',
    dataSource: '官方网页',
    updateFreq: '实时',
    itemCount: 50,
    difficulty: 2,
    description: '搜索引擎权威排行，数据准确',
    apiEndpoint: 'https://top.baidu.com/board',
    method: 'HTML 解析',
    timeout: '10 秒',
    features: ['搜索引擎权威', '数据准确', '更新频率高', '可能有反爬虫'],
    example: { title: '春节返工潮', hot_value: 1000000, rank: 1 },
  },
  {
    id: 'bilibili',
    name: 'B站热门',
    category: '视频平台',
    dataSource: '官方 API',
    updateFreq: '实时',
    itemCount: 50,
    difficulty: 1,
    description: '视频平台权威排行，官方 API',
    apiEndpoint: 'https://api.bilibili.com/x/web-interface/ranking',
    method: 'GET',
    timeout: '10 秒',
    features: ['视频平台权威', '官方 API', '无需登录', '中文内容为主'],
    example: { title: '【官方】2026 年度总结', hot_value: 10000000, rank: 1 },
  },
  {
    id: 'douban-movie',
    name: '豆瓣电影',
    category: '电影评分',
    dataSource: '官方网页',
    updateFreq: '每天',
    itemCount: 20,
    difficulty: 2,
    description: '电影评分权威，内容质量高',
    apiEndpoint: 'https://movie.douban.com/chart/',
    method: 'HTML 解析',
    timeout: '10 秒',
    features: ['电影评分权威', '内容质量高', '更新频率低', '可能有反爬虫'],
    example: { title: '2026 年度最佳电影', hot_value: 850, rank: 1 },
  },
  {
    id: 'thepaper',
    name: '澎湃新闻',
    category: '新闻资讯',
    dataSource: '官方网页',
    updateFreq: '实时',
    itemCount: 20,
    difficulty: 2,
    description: '新闻权威，内容专业',
    apiEndpoint: 'https://www.thepaper.cn/',
    method: 'HTML 解析',
    timeout: '10 秒',
    features: ['新闻权威', '内容专业', '更新频率高', '可能有反爬虫'],
    example: { title: '澎湃评论：如何看待新政策', hot_value: 500, rank: 1 },
  },
  {
    id: 'hackernews',
    name: 'Hacker News',
    category: '技术社区',
    dataSource: '官方网页',
    updateFreq: '实时',
    itemCount: 30,
    difficulty: 1,
    description: '技术社区权威排行，内容质量高',
    apiEndpoint: 'https://news.ycombinator.com/',
    method: 'HTML 解析',
    timeout: '10 秒',
    features: ['权威排行', '内容质量高', '更新频率高', '英文内容为主'],
    example: { title: 'Show HN: New AI Framework', hot_value: 500, rank: 1 },
  },
]

const CATEGORIES = ['全部', ...new Set(PLATFORMS.map(p => p.category))]

export default function KnowledgeBasePage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('全部')
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [copied, setCopied] = useState(false)

  const filtered = useMemo(() => {
    return PLATFORMS.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                         p.description.toLowerCase().includes(search.toLowerCase())
      const matchCategory = category === '全部' || p.category === category
      return matchSearch && matchCategory
    })
  }, [search, category])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty === 1) return 'bg-green-100 text-green-700'
    if (difficulty === 2) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty === 1) return '简单'
    if (difficulty === 2) return '中等'
    return '困难'
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">平台抓取知识库</h1>
        <p className="text-sm text-gray-500 mt-1">了解每个平台的抓取方式、数据源和特点</p>
      </div>

      {/* 搜索和筛选 */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索平台名称或描述..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                category === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 平台列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(platform => (
          <div key={platform.id} onClick={() => setSelectedPlatform(platform)}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg hover:border-blue-300 cursor-pointer transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900">{platform.name}</h3>
                <p className="text-xs text-gray-500">{platform.category}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(platform.difficulty)}`}>
                {getDifficultyLabel(platform.difficulty)}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-3">{platform.description}</p>

            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div>
                <p className="text-gray-500">数据源</p>
                <p className="font-medium text-gray-900">{platform.dataSource}</p>
              </div>
              <div>
                <p className="text-gray-500">更新频率</p>
                <p className="font-medium text-gray-900">{platform.updateFreq}</p>
              </div>
              <div>
                <p className="text-gray-500">条数</p>
                <p className="font-medium text-gray-900">{platform.itemCount}</p>
              </div>
              <div>
                <p className="text-gray-500">超时</p>
                <p className="font-medium text-gray-900">{platform.timeout}</p>
              </div>
            </div>

            <button className="w-full px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
              查看详情 →
            </button>
          </div>
        ))}
      </div>

      {/* 详情弹窗 */}
      {selectedPlatform && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedPlatform.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedPlatform.category}</p>
              </div>
              <button onClick={() => setSelectedPlatform(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <p className="text-gray-600">{selectedPlatform.description}</p>

            {/* 基本信息 */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="font-bold text-gray-900">基本信息</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">数据源</p>
                  <p className="font-medium">{selectedPlatform.dataSource}</p>
                </div>
                <div>
                  <p className="text-gray-500">更新频率</p>
                  <p className="font-medium">{selectedPlatform.updateFreq}</p>
                </div>
                <div>
                  <p className="text-gray-500">抓取条数</p>
                  <p className="font-medium">{selectedPlatform.itemCount}</p>
                </div>
                <div>
                  <p className="text-gray-500">难度</p>
                  <p className="font-medium">{getDifficultyLabel(selectedPlatform.difficulty)}</p>
                </div>
              </div>
            </div>

            {/* 抓取方式 */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="font-bold text-gray-900">抓取方式</h3>
              <div className="space-y-2 text-sm">
                {selectedPlatform.apiEndpoint && (
                  <div>
                    <p className="text-gray-500">API 端点</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-white px-2 py-1 rounded border border-gray-200 text-xs font-mono flex-1 overflow-x-auto">
                        {selectedPlatform.apiEndpoint}
                      </code>
                      <button onClick={() => copyToClipboard(selectedPlatform.apiEndpoint!)}
                        className="p-1 hover:bg-gray-200 rounded">
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-gray-500">请求方法</p>
                  <p className="font-mono font-medium">{selectedPlatform.method}</p>
                </div>
                <div>
                  <p className="text-gray-500">超时时间</p>
                  <p className="font-medium">{selectedPlatform.timeout}</p>
                </div>
              </div>
            </div>

            {/* 特点 */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="font-bold text-gray-900">特点</h3>
              <div className="flex flex-wrap gap-2">
                {selectedPlatform.features.map(feature => (
                  <span key={feature} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            {/* 示例数据 */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="font-bold text-gray-900">示例数据</h3>
              <pre className="bg-white p-3 rounded border border-gray-200 text-xs overflow-x-auto">
                {JSON.stringify(selectedPlatform.example, null, 2)}
              </pre>
            </div>

            <button onClick={() => setSelectedPlatform(null)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 统计信息 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">总平台数</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{PLATFORMS.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">总数据量</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{PLATFORMS.reduce((sum, p) => sum + p.itemCount, 0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">API 源</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{PLATFORMS.filter(p => p.dataSource.includes('API')).length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">平均难度</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {(PLATFORMS.reduce((sum, p) => sum + p.difficulty, 0) / PLATFORMS.length).toFixed(1)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
