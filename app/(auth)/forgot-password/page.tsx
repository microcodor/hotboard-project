/**
 * 忘记密码页面
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { forgotPasswordSchema } from '@/lib/validation';

export default function ForgotPasswordPage() {
  const { resetPassword, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    // 验证邮箱
    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setFieldError(validation.error.errors[0]?.message || '请输入有效的邮箱');
      return;
    }

    const result = await resetPassword(email);
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || '发送失败，请重试');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              邮件已发送
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              我们已向 <strong>{email}</strong> 发送了密码重置邮件，请查收邮件并按照指引重置密码。
            </p>
            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full rounded-lg bg-blue-600 py-2.5 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                返回登录
              </Link>
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                }}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                重新发送
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              🔥 HotBoard
            </h1>
          </Link>
          <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            忘记密码？
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            输入您的邮箱，我们将发送重置链接
          </p>
        </div>

        {/* 表单卡片 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 邮箱 */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                邮箱
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldError(null);
                    setError(null);
                  }}
                  placeholder="your@email.com"
                  required
                  className={cn(
                    'w-full rounded-lg border py-2.5 pl-10 pr-4 text-gray-900 placeholder-gray-400',
                    'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                    'dark:bg-gray-800 dark:text-white dark:border-gray-700',
                    fieldError ? 'border-red-500' : 'border-gray-300'
                  )}
                />
              </div>
              {fieldError && (
                <p className="text-sm text-red-500">{fieldError}</p>
              )}
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
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
                  发送中...
                </span>
              ) : (
                '发送重置链接'
              )}
            </button>

            {/* 返回登录 */}
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600"
            >
              <ArrowLeft className="h-4 w-4" />
              返回登录
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
