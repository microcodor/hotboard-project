/**
 * 认证相关类型定义
 */
import type { User, Session } from '@supabase/supabase-js';

// 用户资料
export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  favorites: string[];
  created_at: string;
  updated_at: string;
}

// 认证状态
export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// 注册输入
export interface RegisterInput {
  email: string;
  password: string;
  confirmPassword: string;
  username?: string;
}

// 登录输入
export interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// 忘记密码输入
export interface ForgotPasswordInput {
  email: string;
}

// 重置密码输入
export interface ResetPasswordInput {
  password: string;
  confirmPassword: string;
}

// 修改密码输入
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// API 响应
export interface AuthResponse {
  success: boolean;
  error?: string;
  data?: {
    user: User | null;
    session: Session | null;
  };
  message?: string;
}
