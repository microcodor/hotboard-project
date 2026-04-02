/**
 * 认证相关 Hooks — 基于本地 PostgreSQL API
 */
'use client';

import { useEffect, useState, useCallback } from 'react';

interface User {
  id: number;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });

  // 初始化：从 /api/auth/me 获取当前登录用户
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        setState({ user: data.success ? data.user : null, isLoading: false, error: null });
      })
      .catch(() => {
        setState({ user: null, isLoading: false, error: null });
      });
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 注册
  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username: displayName }),
    });
    const data = await res.json();
    if (!data.success) {
      setState(prev => ({ ...prev, isLoading: false, error: data.error }));
      throw new Error(data.error);
    }
    setState({ user: data.user, isLoading: false, error: null });
    return data;
  }, []);

  // 注册并跳转（RegisterForm 调用）
  const signUpAndRedirect = useCallback(async (
    email: string,
    password: string,
    displayName?: string,
    redirectUrl?: string
  ) => {
    try {
      await signUp(email, password, displayName);
      if (redirectUrl) window.location.href = redirectUrl;
      else window.location.href = '/';
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, [signUp]);

  // 登录
  const signIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) {
      setState(prev => ({ ...prev, isLoading: false, error: data.error }));
      throw new Error(data.error);
    }
    setState({ user: data.user, isLoading: false, error: null });
    return data;
  }, []);

  // 登录并跳转（LoginForm 调用）
  const signInAndRedirect = useCallback(async (
    email: string,
    password: string,
    redirectUrl?: string
  ) => {
    try {
      await signIn(email, password);
      if (redirectUrl) window.location.href = redirectUrl;
      else window.location.href = '/';
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, [signIn]);

  // 登出
  const signOut = useCallback(async () => {
    await fetch('/api/auth/me', { method: 'DELETE' });
    setState({ user: null, isLoading: false, error: null });
    window.location.href = '/';
  }, []);

  const updateProfile = useCallback(async (updates: Record<string, any>) => {
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    setState(prev => ({ ...prev, user: data.user }));
  }, []);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    updateProfile,
    signUpAndRedirect,
    signInAndRedirect,
    clearError,
  };
}
