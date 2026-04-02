/**
 * SEO 工具函数
 * 生成结构化数据、Meta 标签等
 */

import { Metadata } from 'next'

/**
 * 网站结构化数据
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'HotBoard',
    url: 'https://hotboard.example.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://hotboard.example.com/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * 组织结构化数据
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'HotBoard',
    description: '全网热榜聚合平台 - 一站式热点追踪服务',
    url: 'https://hotboard.example.com',
    logo: 'https://hotboard.example.com/logo.png',
    sameAs: [
      'https://github.com/hotboard',
    ],
  }
}

/**
 * 榜单项结构化数据
 */
export function generateArticleSchema(article: {
  title: string
  description?: string
  url: string
  image?: string
  datePublished?: string
  dateModified?: string
  author?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: article.image,
    url: article.url,
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    author: {
      '@type': 'Organization',
      name: article.author || 'HotBoard',
    },
  }
}

/**
 * Breadcrumb 结构化数据
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * 生成默认 SEO 元数据
 */
export function generateMetadata(options: {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  authors?: string[]
}): Metadata {
  const {
    title = 'HotBoard - 全网热榜聚合平台',
    description = '一站式热点追踪服务，实时聚合全网热门榜单。涵盖微博、知乎、抖音、B站等平台热点。',
    image = '/og-image.png',
    url = 'https://hotboard.example.com',
    type = 'website',
  } = options

  const siteName = 'HotBoard'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type,
      url,
      siteName,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(options.publishedTime && { publishedTime: options.publishedTime }),
      ...(options.modifiedTime && { modifiedTime: options.modifiedTime }),
      ...(options.authors && { authors: options.authors }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    alternates: {
      canonical: url,
    },
  }
}

/**
 * 页面类型定义
 */
export type PageType = 
  | 'home'
  | 'search'
  | 'hot'
  | 'category'
  | 'node'
  | 'user'
  | 'about'

/**
 * 根据页面类型生成元数据
 */
export function generatePageMetadata(
  pageType: PageType,
  options: {
    title?: string
    description?: string
    nodeName?: string
    categoryName?: string
    userName?: string
    query?: string
  } = {}
): Metadata {
  const baseUrl = 'https://hotboard.example.com'

  switch (pageType) {
    case 'home':
      return generateMetadata({
        title: 'HotBoard - 全网热榜聚合平台',
        description: '一站式热点追踪服务，实时聚合全网热门榜单。涵盖微博、知乎、抖音、B站等平台热点。',
        url: baseUrl,
      })

    case 'search':
      return generateMetadata({
        title: options.query ? `搜索: ${options.query} - HotBoard` : '搜索热点 - HotBoard',
        description: `搜索全网热点，查找与 "${options.query || ''}" 相关的热门话题和榜单。`,
        url: `${baseUrl}/search?q=${encodeURIComponent(options.query || '')}`,
      })

    case 'hot':
      return generateMetadata({
        title: '榜中榜 - 全网最热热点 - HotBoard',
        description: '全网最热热点聚合，实时更新 TOP 100 热门话题。掌握最新热点趋势。',
        url: `${baseUrl}/hot`,
      })

    case 'category':
      return generateMetadata({
        title: `${options.categoryName}榜单 - HotBoard`,
        description: `查看 ${options.categoryName} 分类下的热门榜单，实时追踪 ${options.categoryName} 热点。`,
        url: `${baseUrl}/category/${options.categoryName}`,
      })

    case 'node':
      return generateMetadata({
        title: `${options.nodeName} - HotBoard`,
        description: `${options.nodeName} 热门榜单，实时更新热点内容。`,
        url: `${baseUrl}/n/${options.nodeName}`,
      })

    case 'user':
      return generateMetadata({
        title: `${options.userName} 的收藏 - HotBoard`,
        description: `查看 ${options.userName} 在 HotBoard 的收藏榜单。`,
        url: `${baseUrl}/user/${options.userName}`,
      })

    case 'about':
      return generateMetadata({
        title: '关于 HotBoard',
        description: 'HotBoard 是全网热榜聚合平台，一站式追踪全网热点。',
        url: `${baseUrl}/about`,
      })

    default:
      return generateMetadata({})
  }
}

/**
 * 生成 Robots.txt 内容
 */
export function generateRobotsTxt() {
  const siteUrl = 'https://hotboard.example.com'

  return `
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /user/settings/

Sitemap: ${siteUrl}/sitemap.xml
`.trim()
}
