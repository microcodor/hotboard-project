/**
 * 平台数据解析器
 * 将各平台抓取的原始数据转换为统一格式
 */

import { CrawledItem } from './engine';

/**
 * 解析知乎热榜数据
 */
export function parseZhihu(data: any): CrawledItem[] {
  if (!data?.data) return [];

  return data.data.map((item: any, index: number) => ({
    title: item.target?.title || '',
    url: item.target?.url || `https://www.zhihu.com/question/${item.target?.id}`,
    hot: parseInt(item.detail_text?.replace(/[^0-9]/g, '') || '0'),
    hotText: item.detail_text || '',
    rank: index + 1,
    thumbnail: item.target?.thumbnail || '',
    description: item.target?.excerpt || '',
    extra: {
      questionId: item.target?.id,
      author: item.target?.author?.name,
    },
  }));
}

/**
 * 解析百度热搜数据
 */
export function parseBaidu(data: any): CrawledItem[] {
  if (!data?.data?.cards?.[0]?.content) return [];

  return data.data.cards[0].content.map((item: any, index: number) => ({
    title: item.word || item.query,
    url: item.url || `https://www.baidu.com/s?wd=${encodeURIComponent(item.word || item.query)}`,
    hot: item.hotScore || item.show?.split(' ')[0] || 0,
    hotText: item.show || '',
    rank: item.index || index + 1,
    thumbnail: item.img || '',
    description: item.desc || '',
    extra: {
      rawWord: item.rawWord,
      iosAppSupport: item.iosAppSupport,
    },
  }));
}

/**
 * 解析B站热门数据
 */
export function parseBilibili(data: any): CrawledItem[] {
  if (!data?.data?.list) return [];

  return data.data.list.map((item: any, index: number) => ({
    title: item.title,
    url: `https://www.bilibili.com/video/${item.bvid}`,
    hot: item.stat?.view || 0,
    hotText: `${(item.stat?.view || 0).toLocaleString()}播放`,
    rank: index + 1,
    thumbnail: item.pic,
    description: item.desc?.substring(0, 100),
    extra: {
      bvid: item.bvid,
      author: item.owner?.name,
      duration: item.duration,
    },
  }));
}

/**
 * 解析36氪数据
 */
export function parseKr36(data: any): CrawledItem[] {
  if (!data?.data?.list) return [];

  return data.data.list.map((item: any, index: number) => ({
    title: item.title,
    url: `https://36kr.com/p/${item.id}`,
    hot: item.stat?.pv || 0,
    hotText: `${item.stat?.pv || 0}阅读`,
    rank: index + 1,
    thumbnail: item.cover || '',
    description: item.summary || '',
    extra: {
      id: item.id,
      author: item.author?.name,
    },
  }));
}

/**
 * 解析掘金热榜数据
 */
export function parseJuejin(data: any): CrawledItem[] {
  if (!data?.data) return [];

  return data.data.map((item: any, index: number) => ({
    title: item.article_info?.title || '',
    url: `https://juejin.cn/post/${item.article_id}`,
    hot: item.article_info?.view_count || 0,
    hotText: `${item.article_info?.view_count || 0}阅读`,
    rank: index + 1,
    thumbnail: item.article_info?.cover_image || '',
    description: item.article_info?.brief_content?.substring(0, 100) || '',
    extra: {
      articleId: item.article_id,
      author: item.author_user_info?.user_name,
    },
  }));
}

/**
 * 解析V2EX数据
 */
export function parseV2ex(data: any[]): CrawledItem[] {
  if (!Array.isArray(data)) return [];

  return data.map((item, index) => ({
    title: item.title,
    url: item.url,
    hot: item.replies || 0,
    hotText: `${item.replies || 0}回复`,
    rank: index + 1,
    thumbnail: '',
    description: item.content_rendered?.replace(/<[^>]+>/g, '').substring(0, 100) || '',
    extra: {
      id: item.id,
      node: item.node?.title,
      author: item.member?.username,
    },
  }));
}

/**
 * 解析Hacker News数据
 */
export async function parseHackerNews(ids: number[]): Promise<CrawledItem[]> {
  const items: CrawledItem[] = [];
  const baseUrl = 'https://hacker-news.firebaseio.com/v0/item';

  for (let i = 0; i < Math.min(ids.length, 50); i++) {
    const id = ids[i];
    try {
      const res = await fetch(`${baseUrl}/${id}.json`);
      const story = await res.json();
      if (story) {
        items.push({
          title: story.title,
          url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
          hot: story.score || 0,
          hotText: `${story.score || 0} points`,
          rank: i + 1,
          thumbnail: '',
          description: story.text?.replace(/<[^>]+>/g, '').substring(0, 100) || '',
          extra: {
            id: story.id,
            by: story.by,
            descendants: story.descendants,
          },
        });
      }
    } catch (e) {
      // skip failed
    }
  }

  return items;
}

// 解析器映射
export const parsers: Record<string, (data: any) => CrawledItem[] | Promise<CrawledItem[]>> = {
  zhihu: parseZhihu,
  baidu: parseBaidu,
  bilibili: parseBilibili,
  kr36: parseKr36,
  juejin: parseJuejin,
  v2ex: parseV2ex,
  hackernews: parseHackerNews,
};
