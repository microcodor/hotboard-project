/**
 * 注册页面
 */
import { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from '@/components/auth';

export const metadata: Metadata = {
  title: '注册 - HotBoard 热榜聚合',
  description: '注册 HotBoard 账号，开始追踪全网热点',
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              🔥 HotBoard
            </h1>
          </Link>
          <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            创建账号
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            开始追踪全网热点，发现有趣内容
          </p>
        </div>

        {/* 注册表单卡片 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
          <RegisterForm redirectUrl="/" />

          {/* 分隔线 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-900 text-gray-500">
                或
              </span>
            </div>
          </div>

          {/* 社交登录（预留） */}
          <div className="space-y-3">
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 dark:border-gray-700 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              使用 Google 登录
              <span className="text-xs text-gray-400">(即将推出)</span>
            </button>

            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 dark:border-gray-700 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.49.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.58 9.58 0 0112 6.8c.85 0 1.7.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10.007 10.007 0 0022 12c0-5.523-4.477-10-10-10z" />
              </svg>
              使用 GitHub 登录
              <span className="text-xs text-gray-400">(即将推出)</span>
            </button>
          </div>
        </div>

        {/* 底部链接 */}
        <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          <p>
            遇到问题？{' '}
            <Link href="/help" className="text-blue-600 hover:text-blue-700">
              帮助中心
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
