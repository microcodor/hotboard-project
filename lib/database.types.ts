/**
 * 数据库类型定义（Supabase 生成格式）
 * 用于 TypeScript 类型安全
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: number;
          name: string;
          slug: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          slug: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          slug?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      nodes: {
        Row: {
          id: number;
          hashid: string;
          name: string;
          display: string;
          cid: number;
          logo: string;
          url: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          hashid: string;
          name: string;
          display: string;
          cid: number;
          logo: string;
          url: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          hashid?: string;
          name?: string;
          display?: string;
          cid?: number;
          logo?: string;
          url?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      node_items: {
        Row: {
          id: number;
          node_hashid: string;
          title: string;
          description: string | null;
          url: string;
          thumbnail: string | null;
          extra: Json | null;
          rank: number;
          hot_value: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          node_hashid: string;
          title: string;
          description?: string | null;
          url: string;
          thumbnail?: string | null;
          extra?: Json | null;
          rank: number;
          hot_value?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          node_hashid?: string;
          title?: string;
          description?: string | null;
          url?: string;
          thumbnail?: string | null;
          extra?: Json | null;
          rank?: number;
          hot_value?: number | null;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          username: string | null;
          avatar_url: string | null;
          favorites: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          username?: string | null;
          avatar_url?: string | null;
          favorites?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string | null;
          avatar_url?: string | null;
          favorites?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      search_logs: {
        Row: {
          id: number;
          query: string;
          user_id: string | null;
          results_count: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          query: string;
          user_id?: string | null;
          results_count?: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          query?: string;
          user_id?: string | null;
          results_count?: number;
          created_at?: string;
        };
      };
      sync_logs: {
        Row: {
          id: number;
          node_hashid: string;
          status: 'pending' | 'success' | 'failed';
          items_count: number;
          error_message: string | null;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: number;
          node_hashid: string;
          status?: 'pending' | 'success' | 'failed';
          items_count?: number;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: number;
          node_hashid?: string;
          status?: 'pending' | 'success' | 'failed';
          items_count?: number;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      sync_status: 'pending' | 'success' | 'failed';
    };
  };
}

// 导出常用的类型
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
