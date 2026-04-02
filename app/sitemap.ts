/**
 * Sitemap 生成器
 * 自动生成网站的 XML sitemap
 */

import { MetadataRoute } from 'next'

// 网站基础 URL
const BASE_URL = 'https://hotboard.example.com'

// 静态页面
const staticPages = [
  { url: '/', priority: 1.0, changefreq: 'hourly' as const },
  { url: '/hot', priority: 0.9, changefreq: 'hourly' as const },
  { url: '/search', priority: 0.8, changefreq: 'daily' as const },
  { url: '/calendar', priority: 0.7, changefreq: 'weekly' as const },
  { url: '/about', priority: 0.5, changefreq: 'monthly' as const },
  { url: '/user/favorites', priority: 0.6, changefreq: 'daily' as const },
]

// 榜单分类
const categories = [
  'tech', 'news', 'entertainment', 'sports', 
  'finance', 'food', 'travel', 'game'
]

// 热门榜单
const hotNodes = [
  'weibo', 'zhihu', 'douyin', 'bilibili',
  'toutiao', 'baidu', 'twitter'
]

/**
 * 生成 sitemap.xml
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  // 静态页面
  const staticSitemap: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: `${BASE_URL}${page.url}`,
    lastModified: now,
    changeFrequency: page.changefreq,
    priority: page.priority,
  }))

  // 分类页面
  const categorySitemap: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${BASE_URL}/category/${category}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  // 榜单详情页面
  const nodeSitemap: MetadataRoute.Sitemap = hotNodes.map((node) => ({
    url: `${BASE_URL}/n/${node}`,
    lastModified: now,
    changeFrequency: 'hourly',
    priority: 0.9,
  }))

  // 用户相关页面
  const userSitemap: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/user/profile`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/user/history`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.6,
    },
  ]

  // 组合所有 sitemap
  return [
    ...staticSitemap,
    ...categorySitemap,
    ...nodeSitemap,
    ...userSitemap,
  ]
}

/**
 * 生成 robots.txt
 */
export function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/user/settings/',
          '/user/password/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
