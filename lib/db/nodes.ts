/**
 * 榜单数据库操作层
 * 封装所有榜单相关的数据库操作
 */

import { getSupabaseAdmin } from '../supabase';
import type { Node, NodeItem, Category, DbResult } from '../../types/db';
import type { GetNodesParams, GetNodeItemsParams } from '../../types/api';

/**
 * 榜单数据库操作对象
 */
export const nodesDb = {
  /**
   * 获取所有榜单
   * @param params 查询参数
   * @returns 榜单列表
   */
  async getAll(params: GetNodesParams = {}): Promise<DbResult<Node[]>> {
    const supabase = getSupabaseAdmin();
    const { cid, page = 1, pageSize = 100, isActive = true } = params;

    try {
      let query = supabase
        .from('nodes')
        .select('*', { count: 'exact' })
        .order('sort_order', { ascending: true });

      // 按分类筛选
      if (cid !== undefined) {
        query = query.eq('cid', cid);
      }

      // 按激活状态筛选
      if (isActive) {
        query = query.eq('is_active', true);
      }

      // 分页
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } };
      }

      return { data: data || [], error: null, count };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { data: null, error: { message: errorMessage } };
    }
  },

  /**
   * 根据 hashid 获取榜单详情
   * @param hashid 榜单唯一标识
   * @returns 榜单详情
   */
  async getByHashid(hashid: string): Promise<DbResult<Node>> {
    const supabase = getSupabaseAdmin();

    try {
      const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .eq('hashid', hashid)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: null, error: { message: '榜单不存在', code: 'NOT_FOUND' } };
        }
        return { data: null, error: { message: error.message, code: error.code } };
      }

      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { data: null, error: { message: errorMessage } };
    }
  },

  /**
   * 获取榜单内容项
   * @param params 查询参数
   * @returns 榜单内容项列表
   */
  async getItems(params: GetNodeItemsParams): Promise<DbResult<NodeItem[]>> {
    const supabase = getSupabaseAdmin();
    const { hashid, page = 1, pageSize = 50 } = params;

    try {
      // 先验证榜单是否存在
      const nodeResult = await this.getByHashid(hashid);
      if (nodeResult.error) {
        return { data: null, error: nodeResult.error };
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('node_items')
        .select('*', { count: 'exact' })
        .eq('node_hashid', hashid)
        .order('rank', { ascending: true })
        .range(from, to);

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } };
      }

      return { data: data || [], error: null, count };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { data: null, error: { message: errorMessage } };
    }
  },

  /**
   * 批量获取多个榜单的内容
   * @param hashids 榜单 hashid 数组
   * @returns 榜单内容映射
   */
  async getItemsBatch(
    hashids: string[]
  ): Promise<DbResult<Record<string, NodeItem[]>>> {
    const supabase = getSupabaseAdmin();

    try {
      const { data, error } = await supabase
        .from('node_items')
        .select('*')
        .in('node_hashid', hashids)
        .order('rank', { ascending: true });

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } };
      }

      // 按 node_hashid 分组
      const itemsMap: Record<string, NodeItem[]> = {};
      for (const item of data || []) {
        if (!itemsMap[item.node_hashid]) {
          itemsMap[item.node_hashid] = [];
        }
        itemsMap[item.node_hashid].push(item);
      }

      return { data: itemsMap, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { data: null, error: { message: errorMessage } };
    }
  },

  /**
   * 保存榜单内容项（用于数据同步）
   * @param hashid 榜单 hashid
   * @param items 内容项数组
   * @returns 操作结果
   */
  async saveItems(
    hashid: string,
    items: Omit<NodeItem, 'id' | 'node_hashid' | 'created_at'>[]
  ): Promise<DbResult<void>> {
    const supabase = getSupabaseAdmin();

    try {
      // 先删除旧数据
      const { error: deleteError } = await supabase
        .from('node_items')
        .delete()
        .eq('node_hashid', hashid);

      if (deleteError) {
        return { data: null, error: { message: deleteError.message } };
      }

      // 插入新数据
      if (items.length > 0) {
        const insertData = items.map((item) => ({
          node_hashid: hashid,
          title: item.title,
          description: item.description,
          url: item.url,
          thumbnail: item.thumbnail,
          extra: item.extra,
          rank: item.rank,
          hot_value: item.hot_value,
        }));

        const { error: insertError } = await supabase
          .from('node_items')
          .insert(insertData);

        if (insertError) {
          return { data: null, error: { message: insertError.message } };
        }
      }

      return { data: null, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { data: null, error: { message: errorMessage } };
    }
  },
};

/**
 * 分类数据库操作对象
 */
export const categoriesDb = {
  /**
   * 获取所有分类
   * @returns 分类列表
   */
  async getAll(): Promise<DbResult<Category[]>> {
    const supabase = getSupabaseAdmin();

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } };
      }

      return { data: data || [], error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { data: null, error: { message: errorMessage } };
    }
  },

  /**
   * 根据 ID 获取分类
   * @param id 分类 ID
   * @returns 分类详情
   */
  async getById(id: number): Promise<DbResult<Category>> {
    const supabase = getSupabaseAdmin();

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } };
      }

      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { data: null, error: { message: errorMessage } };
    }
  },
};
