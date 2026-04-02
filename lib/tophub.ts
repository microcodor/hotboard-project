/**
 * TopHub API 客户端
 * 封装榜眼数据 API 的所有操作
 */

import { ApiClient, createApiClient } from './api-client';
import { appConfig } from './config';
import { ApiError, ErrorCode, ErrorFactory, ValidationError } from './errors';
import type { HotNode, HotItem, Category } from '@/types';

/**
 * TopHub API 响应类型
 */
export interface TopHubNodeResponse {
  code: number;
  message?: string;
  data: {
    list: TopHubNode[];
    total?: number;
  };
}

export interface TopHubNodeDetailResponse {
  code: number;
  message?: string;
  data: TopHubNodeDetail;
}

export interface TopHubSearchResponse {
  code: number;
  message?: string;
  data: {
    list: TopHubSearchResult[];
    total?: number;
  };
}

/**
 * TopHub API 数据结构
 */
export interface TopHubNode {
  id: string;
  hashid: string;
  name: string;
  url: string;
  logo: string;
  cid: number;
  cname: string;
  sort_order: number;
  display?: string;
}

export interface TopHubNodeDetail extends TopHubNode {
  list: TopHubItem[];
  update_time: string;
}

export interface TopHubItem {
  id: string;
  title: string;
  url: string;
  hot_value: number;
  thumbnail?: string;
  description?: string;
  extra?: Record<string, any>;
}

export interface TopHubSearchResult {
  title: string;
  url: string;
  hot_value: number;
  node_name: string;
  node_hashid: string;
}

/**
 * TopHub API 客户端类
 */
export class TopHubClient {
  private client: ApiClient;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || appConfig.tophub.apiKey;
    
    if (!this.apiKey) {
      throw ErrorFactory.configMissing('TOPHUB_API_KEY');
    }

    this.client = createApiClient({
      baseUrl: appConfig.tophub.baseUrl,
      timeout: appConfig.tophub.timeout,
      retries: appConfig.tophub.retries,
      headers: {
        'Authorization': this.apiKey,
      },
    });
  }

  /**
   * 获取所有榜单节点
   * @param cid 分类 ID（可选）
   */
  async getNodes(cid?: number): Promise<TopHubNode[]> {
    const params = new URLSearchParams();
    if (cid) {
      params.append('cid', cid.toString());
    }

    const url = `/nodes${params.toString() ? `?${params}` : ''}`;
    
    try {
      const response = await this.client.get<TopHubNodeResponse>(url);
      
      this.validateResponse(response.data, 'nodes');
      
      return response.data.data.list;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        'Failed to fetch nodes from TopHub',
        ErrorCode.API_ERROR,
        500,
        { originalError: error }
      );
    }
  }

  /**
   * 获取榜单详情
   * @param hashid 榜单 hashid
   */
  async getNodeDetail(hashid: string): Promise<TopHubNodeDetail> {
    if (!hashid) {
      throw new ValidationError('hashid is required', ErrorCode.VALIDATION_REQUIRED, {
        field: 'hashid',
      });
    }

    try {
      const response = await this.client.get<TopHubNodeDetailResponse>(`/nodes/${hashid}`);
      
      this.validateResponse(response.data, `node/${hashid}`);
      
      return response.data.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to fetch node detail for ${hashid}`,
        ErrorCode.API_ERROR,
        500,
        { hashid, originalError: error }
      );
    }
  }

  /**
   * 搜索热点
   * @param query 搜索关键词
   * @param hashid 限定榜单（可选）
   */
  async search(
    query: string,
    hashid?: string
  ): Promise<TopHubSearchResult[]> {
    if (!query || query.trim().length === 0) {
      throw new ValidationError('query is required', ErrorCode.VALIDATION_REQUIRED, {
        field: 'query',
      });
    }

    const params = new URLSearchParams({
      q: query.trim(),
    });

    if (hashid) {
      params.append('hashid', hashid);
    }

    try {
      const response = await this.client.get<TopHubSearchResponse>(`/search?${params}`);
      
      this.validateResponse(response.data, 'search');
      
      return response.data.data.list;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to search for "${query}"`,
        ErrorCode.API_ERROR,
        500,
        { query, hashid, originalError: error }
      );
    }
  }

  /**
   * 批量获取多个榜单详情
   * @param hashids 榜单 hashid 数组
   */
  async batchGetNodeDetails(hashids: string[]): Promise<Map<string, TopHubNodeDetail>> {
    const results = new Map<string, TopHubNodeDetail>();
    
    // 并发获取，但限制并发数
    const batchSize = 5;
    
    for (let i = 0; i < hashids.length; i += batchSize) {
      const batch = hashids.slice(i, i + batchSize);
      
      const promises = batch.map(async (hashid) => {
        try {
          const detail = await this.getNodeDetail(hashid);
          results.set(hashid, detail);
        } catch (error) {
          console.error(`Failed to fetch node ${hashid}:`, error);
          // 继续处理其他榜单
        }
      });

      await Promise.all(promises);
      
      // 批次间延迟，避免速率限制
      if (i + batchSize < hashids.length) {
        await this.sleep(1000);
      }
    }

    return results;
  }

  /**
   * 获取分类列表
   */
  async getCategories(): Promise<Category[]> {
    // TopHub API 不直接提供分类列表，从节点列表中提取
    const nodes = await this.getNodes();
    
    const categoryMap = new Map<number, Category>();
    
    nodes.forEach((node) => {
      if (!categoryMap.has(node.cid)) {
        categoryMap.set(node.cid, {
          id: node.cid.toString(),
          name: node.cname,
          slug: node.cname.toLowerCase().replace(/\s+/g, '-'),
          sort_order: node.cid,
        });
      }
    });

    return Array.from(categoryMap.values()).sort((a, b) => 
      parseInt(a.id) - parseInt(b.id)
    );
  }

  /**
   * 转换 TopHub 节点为应用内部格式
   */
  convertToHotNode(node: TopHubNode | TopHubNodeDetail): HotNode {
    const items: HotItem[] = 'list' in node 
      ? node.list.map((item, index) => ({
          id: item.id,
          title: item.title,
          url: item.url,
          hot_value: item.hot_value,
          rank: index + 1,
          extra: item.extra,
        }))
      : [];

    return {
      id: node.id,
      hashid: node.hashid,
      name: node.name,
      url: node.url,
      source_type: 'tophub',
      category_id: node.cid.toString(),
      icon_url: node.logo,
      description: node.display || node.name,
      items,
      updated_at: 'update_time' in node ? node.update_time : new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
  }

  /**
   * 验证 API 响应
   */
  private validateResponse(response: any, context: string): void {
    if (!response) {
      throw ErrorFactory.apiInvalidResponse(context, 'Empty response');
    }

    if (response.code !== undefined && response.code !== 0) {
      throw new ApiError(
        response.message || 'API returned error code',
        ErrorCode.API_ERROR,
        500,
        { code: response.code, context }
      );
    }

    if (!response.data) {
      throw ErrorFactory.apiInvalidResponse(context, 'Missing data field');
    }
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取速率限制状态
   */
  getRateLimitStatus() {
    return this.client.getRateLimitStatus();
  }
}

/**
 * 创建 TopHub 客户端实例
 */
export function createTopHubClient(apiKey?: string): TopHubClient {
  return new TopHubClient(apiKey);
}

/**
 * 默认 TopHub 客户端实例（懒加载）
 */
let defaultClient: TopHubClient | null = null;

export function getTopHubClient(): TopHubClient {
  if (!defaultClient) {
    defaultClient = createTopHubClient();
  }
  return defaultClient;
}
