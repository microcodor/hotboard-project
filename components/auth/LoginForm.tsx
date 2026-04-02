/**
 * 登录表单组件
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { loginSchema, type LoginInput } from '@/lib/validation';

interface LoginFormProps {
  redirectUrl?: string;
  className?: string;
}

export function LoginForm({ redirectUrl, className }: LoginFormProps) {
  const { signInAndRedirect, isLoading, error, clearError } = useAuth();

  // 表单状态
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  // UI 状态
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // 清除该字段的错误
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (submitError) {
      setSubmitError(null);
    }
  };

  // 验证表单
  const validateForm = (): boolean => {
    try {
      loginSchema.parse(formData);
      setFieldErrors({});
      return true;
    } catch (err) {
      if (err instanceof Error && 'errors' in err) {
        const errors: Record<string, string> = {};
        (err as any).errors.forEach((e: any) => {
          if (e.path[0]) {
            errors[e.path[0]] = e.message;
          }
        });
        setFieldErrors(errors);
      }
      return false;
    }
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitError(null);
    clearError();

    const result = await signInAndRedirect(formData.email, formData.password, redirectUrl);

    if (!result.success) {
      setSubmitError(result.error || '登录失败，请重试');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* 邮箱 */}
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          邮箱
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="your@email.com"
            required
            autoComplete="email"
            className={cn(
              'w-full rounded-lg border py-2.5 pl-10 pr-4 text-gray-900 placeholder-gray-400',
              'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
              'dark:bg-gray-800 dark:text-white dark:border-gray-700',
              fieldErrors.email ? 'border-red-500' : 'border-gray-300'
            )}
          />
        </div>
        {fieldErrors.email && (
          <p className="text-sm text-red-500">{fieldErrors.email}</p>
        )}
      </div>

      {/* 密码 */}
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          密码
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            placeholder="输入密码"
            required
            autoComplete="current-password"
            className={cn(
              'w-full rounded-lg border py-2.5 pl-10 pr-12 text-gray-900 placeholder-gray-400',
              'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
              'dark:bg-gray-800 dark:text-white dark:border-gray-700',
              fieldErrors.password ? 'border-red-500' : 'border-gray-300'
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {fieldErrors.password && (
          <p className="text-sm text-red-500">{fieldErrors.password}</p>
        )}
      </div>

      {/* 记住我 & 忘记密码 */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="rememberMe"
            checked={formData.rememberMe}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">记住我</span>
        </label>
        <Link
          href="/forgot-password"
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          忘记密码？
        </Link>
      </div>

      {/* 错误提示 */}
      {submitError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {submitError}
        </div>
      )}

      {/* 提交按钮 */}
      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          'w-full rounded-lg bg-blue-600 py-2.5 text-white font-medium',
          'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors'
        )}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            登录中...
          </span>
        ) : (
          '登录'
        )}
      </button>

      {/* 注册链接 */}
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        还没有账号？{' '}
        <Link
          href="/register"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          立即注册
        </Link>
      </p>
    </form>
  );
}

export default LoginForm;
