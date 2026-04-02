/**
 * 用户数据库操作层
 * 封装所有用户相关的数据库操作
 */

import { getSupabaseAdmin } from '../supabase';
import type { UserProfile, DbResult } from '../../types';

/**
 * 用户数据库操作对象
 */
export const usersDb = {
  /**
   * 根据用户 ID 获取用户资料
   * @param userId 用户 ID
   * @returns 用户资料
   */
  async getProfile(userId: string): Promise<DbResult<UserProfile>> {
    const supabase = getSupabaseAdmin();

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: null, error: { message: '用户不存在', code: 'NOT_FOUND' } };
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
   * 创建用户资料
   * @param userId 用户 ID
   * @param email 邮箱
   * @param displayName 显示名称
   * @returns 创建结果
   */
  async createProfile(
    userId: string,
    email: string,
    displayName?: string
  ): Promise<DbResult<UserProfile>> {
    const supabase = getSupabaseAdmin();

    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email,
          display_name: displayName || null,
          avatar_url: null,
          bio: null,
          favorites: [],
          created_at: now,
          updated_at: now,
        })
        .select()
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

  /**
   * 更新用户资料
   * @param userId 用户 ID
   * @param updates 更新字段
   * @returns 更新结果
   */
  async updateProfile(
    userId: string,
    updates: Partial<Omit<UserProfile, 'id' | 'created_at'>>
  ): Promise<DbResult<UserProfile>> {
    const supabase = getSupabaseAdmin();

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
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

  /**
   * 添加收藏
   * @param userId 用户 ID
   * @param nodeHashid 榜单 hashid
   * @returns 操作结果
   */
  async addFavorite(userId: string, nodeHashid: string): Promise<DbResult<void>> {
    const supabase = getSupabaseAdmin();

    try {
      // 获取当前收藏列表
      const profileResult = await this.getProfile(userId);
      if (profileResult.error) {
        return { data: null, error: profileResult.error };
      }

      const profile = profileResult.data!;
      const favorites = profile.favorites || [];

      // 避免重复
      if (favorites.includes(nodeHashid)) {
        return { data: null, error: null };
      }

      // 更新收藏列表
      const updatedFavorites = [...favorites, nodeHashid];
      const { error } = await supabase
        .from('profiles')
        .update({
          favorites: updatedFavorites,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } };
      }

      return { data: null, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { data: null, error: { message: errorMessage } };
    }
  },

  /**
   * 移除收藏
   * @param userId 用户 ID
   * @param nodeHashid 榜单 hashid
   * @returns 操作结果
   */
  async removeFavorite(userId: string, nodeHashid: string): Promise<DbResult<void>> {
    const supabase = getSupabaseAdmin();

    try {
      // 获取当前收藏列表
      const profileResult = await this.getProfile(userId);
      if (profileResult.error) {
        return { data: null, error: profileResult.error };
      }

      const profile = profileResult.data!;
      const favorites = profile.favorites || [];

      // 移除收藏
      const updatedFavorites = favorites.filter(id => id !== nodeHashid);

      const { error } = await supabase
        .from('profiles')
        .update({
          favorites: updatedFavorites,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } };
      }

      return { data: null, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { data: null, error: { message: errorMessage } };
    }
  },

  /**
   * 获取用户收藏的榜单
   * @param userId 用户 ID
   * @returns 收藏的榜单列表
   */
  async getFavorites(userId: string): Promise<DbResult<string[]>> {
    const supabase = getSupabaseAdmin();

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('favorites')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: [], error: null };
        }
        return { data: null, error: { message: error.message, code: error.code } };
      }

      return { data: data?.favorites || [], error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { data: null, error: { message: errorMessage } };
    }
  },

  /**
   * 检查是否收藏
   * @param userId 用户 ID
   * @param nodeHashid 榜单 hashid
   * @returns 是否收藏
   */
  async isFavorited(userId: string, nodeHashid: string): Promise<DbResult<boolean>> {
    const supabase = getSupabaseAdmin();

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('favorites')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: false, error: null };
        }
        return { data: null, error: { message: error.message, code: error.code } };
      }

      const favorites = data?.favorites || [];
      return { data: favorites.includes(nodeHashid), error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { data: null, error: { message: errorMessage } };
    }
  },
};
