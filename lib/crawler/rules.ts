/**
 * 平台抓取规则定义
 * 定义各个平台的抓取方式、URL、解析规则等
 */

import { PlatformRule } from './engine';

/**
 * 知乎热榜 - API 方式
 */
export const zhihuRule: PlatformRule = {
  id: 'zhihu-hot',
  name: '知乎热榜',
  url: 'https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total',
  type: 'api',
  enabled: true,
  cron: '*/10 * * * *',
  parser: 'zhihu',
};

/**
 * 微博热搜 - Puppeteer 方式
 */
export const weiboRule: PlatformRule = {
  id: 'weibo-hot',
  name: '微博热搜',
  url: 'https://s.weibo.com/top/summary',
  type: 'puppeteer',
  enabled: true,
  cron: '*/10 * * * *',
  parser: 'weibo',
  waitFor: '.tbody',
};

/**
 * 百度热搜 - API 方式
 */
export const baiduRule: PlatformRule = {
  id: 'baidu-hot',
  name: '百度热搜',
  url: 'https://top.baidu.com/api/board?tab=realtime',
  type: 'api',
  enabled: true,
  cron: '*/10 * * * *',
  parser: 'baidu',
};

/**
 * 抖音热点 - Puppeteer 方式
 */
export const douyinRule: PlatformRule = {
  id: 'douyin-hot',
  name: '抖音热点',
  url: 'https://www.douyin.com/hot',
  type: 'puppeteer',
  enabled: true,
  cron: '*/15 * * * *',
  parser: 'douyin',
  waitFor: '[data-e2e="hot-list"]',
};

/**
 * B站热门 - API 方式
 */
export const bilibiliRule: PlatformRule = {
  id: 'bilibili-hot',
  name: 'B站热门',
  url: 'https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all',
  type: 'api',
  enabled: true,
  cron: '*/10 * * * *',
  parser: 'bilibili',
  headers: {
    Referer: 'https://www.bilibili.com',
  },
};

/**
 * 36氪 - API 方式
 */
export const kr36Rule: PlatformRule = {
  id: '36kr-hot',
  name: '36氪热榜',
  url: 'https://gateway.36kr.com/api/mis/nav/home/nav/hotList',
  type: 'api',
  enabled: true,
  cron: '*/15 * * * *',
  parser: 'kr36',
  headers: {
    Referer: 'https://36kr.com',
  },
};

/**
 * 掘金热榜 - API 方式
 */
export const juejinRule: PlatformRule = {
  id: 'juejin-hot',
  name: '掘金热榜',
  url: 'https://api.juejin.cn/recommend_api/v1/article/recommend_cate_feed',
  type: 'api',
  enabled: true,
  cron: '*/10 * * * *',
  parser: 'juejin',
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * V2EX - API 方式
 */
export const v2exRule: PlatformRule = {
  id: 'v2ex-hot',
  name: 'V2EX',
  url: 'https://www.v2ex.com/api/topics/hot.json',
  type: 'api',
  enabled: true,
  cron: '*/30 * * * *',
  parser: 'v2ex',
};

/**
 * Hacker News - API 方式
 */
export const hackerNewsRule: PlatformRule = {
  id: 'hn-hot',
  name: 'Hacker News',
  url: 'https://hacker-news.firebaseio.com/v0/topstories.json',
  type: 'api',
  enabled: true,
  cron: '*/15 * * * *',
  parser: 'hackernews',
};

/**
 * 澎湃新闻 - Puppeteer 方式
 */
export const thepaperRule: PlatformRule = {
  id: 'thepaper-hot',
  name: '澎湃新闻',
  url: 'https://www.thepaper.cn/',
  type: 'puppeteer',
  enabled: true,
  cron: '*/15 * * * *',
  parser: 'thepaper',
  waitFor: '.news_list',
};

// 所有平台规则
export const allPlatformRules: PlatformRule[] = [
  zhihuRule,
  weiboRule,
  baiduRule,
  douyinRule,
  bilibiliRule,
  kr36Rule,
  juejinRule,
  v2exRule,
  hackerNewsRule,
  thepaperRule,
];

// 按 ID 查找规则
export function getRuleById(id: string): PlatformRule | undefined {
  return allPlatformRules.find((rule) => rule.id === id);
}

// 获取启用的规则
export function getEnabledRules(): PlatformRule[] {
  return allPlatformRules.filter((rule) => rule.enabled);
}
