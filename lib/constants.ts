/**
 * 应用常量定义
 */

// 分类 ID 映射
export const CATEGORY_MAP: Record<number, { name: string; icon: string }> = {
  1: { name: '科技', icon: 'Cpu' },
  2: { name: '娱乐', icon: 'Music' },
  3: { name: '社区', icon: 'Users' },
  4: { name: '财经', icon: 'TrendingUp' },
  5: { name: '资讯', icon: 'Newspaper' },
  6: { name: '购物', icon: 'ShoppingCart' },
  7: { name: '开发', icon: 'Code' },
  8: { name: '游戏', icon: 'Gamepad2' },
}

// 默认分类
export const DEFAULT_CATEGORY = 0
export const ALL_CATEGORIES = { id: 0, name: '全部', icon: 'LayoutGrid' }

// 分页配置
export const PAGE_SIZE = 20
export const HOT_RANK_LIMIT = 50

// 缓存时间（秒）
export const CACHE_TTL = {
  nodes: 600,      // 榜单列表缓存 10 分钟
  nodeDetail: 300, // 榜单详情缓存 5 分钟
  search: 300,     // 搜索结果缓存 5 分钟
  hot: 300,        // 榜中榜缓存 5 分钟
}

// 热榜源名称映射
export const NODE_NAMES: Record<string, string> = {
  'baidu': '百度热搜',
  'weibo': '微博热搜',
  'zhihu': '知乎热榜',
  'douyin': '抖音热点',
  'toutiao': '今日头条',
  'bilibili': 'B站热门',
  'ithome': 'IT之家',
  '36kr': '36氪',
  'sspai': '少数派',
  'github': 'GitHub Trending',
  'v2ex': 'V2EX',
  'hackernews': 'Hacker News',
  'producthunt': 'Product Hunt',
}

// 默认图片
export const DEFAULT_AVATAR = '/images/default-avatar.png'
export const DEFAULT_LOGO = '/images/default-logo.png'

// API 端点
export const API_ENDPOINTS = {
  nodes: '/api/nodes',
  nodeDetail: (hashid: string) => `/api/nodes/${hashid}`,
  search: '/api/search',
  sync: '/api/sync',
  hot: '/api/hot',
}

// 主题配置
export const THEMES = ['light', 'dark', 'system'] as const
export type Theme = typeof THEMES[number]

// 语言配置
export const LANGUAGES = ['zh-CN', 'en'] as const
export type Language = typeof LANGUAGES[number]
