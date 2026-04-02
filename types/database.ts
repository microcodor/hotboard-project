/**
 * 数据库表类型定义
 */

export interface Database {
  public: {
    Tables: {
      nodes: {
        Row: {
          id: number
          hashid: string
          name: string
          display: string | null
          logo: string | null
          cid: number
          status: 'active' | 'inactive'
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          hashid: string
          name: string
          display?: string | null
          logo?: string | null
          cid: number
          status?: 'active' | 'inactive'
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          hashid?: string
          name?: string
          display?: string | null
          logo?: string | null
          cid?: number
          status?: 'active' | 'inactive'
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      node_items: {
        Row: {
          id: number
          node_hashid: string
          title: string
          description: string | null
          url: string
          thumbnail: string | null
          extra: Json | null
          rank: number
          created_at: string
        }
        Insert: {
          id?: number
          node_hashid: string
          title: string
          description?: string | null
          url: string
          thumbnail?: string | null
          extra?: Json | null
          rank: number
          created_at?: string
        }
        Update: {
          id?: number
          node_hashid?: string
          title?: string
          description?: string | null
          url?: string
          thumbnail?: string | null
          extra?: Json | null
          rank?: number
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: number
          name: string
          sort_order: number
        }
        Insert: {
          id?: number
          name: string
          sort_order?: number
        }
        Update: {
          id?: number
          name?: string
          sort_order?: number
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          favorites: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          favorites?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          favorites?: string[]
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

type Json = string | number | boolean | null | { [key: string]: Json } | Json[]
