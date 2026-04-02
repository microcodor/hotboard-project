/**
 * 注册表单组件
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, User, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  registerSchema,
  checkPasswordStrength,
  getPasswordStrengthColor,
  getPasswordStrengthText,
  type RegisterInput,
} from '@/lib/validation';

interface RegisterFormProps {
  redirectUrl?: string;
  className?: string;
}

export function RegisterForm({ redirectUrl, className }: RegisterFormProps) {
  const router = useRouter();
  const { signUpAndRedirect, isLoading, error, clearError } = useAuth();

  // 表单状态
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
  });

  // UI 状态
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
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
      registerSchema.parse(formData);
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

    const result = await signUpAndRedirect(
      formData.email,
      formData.password,
      formData.username || undefined,
      redirectUrl
    );

    if (!result.success) {
      setSubmitError(result.error || '注册失败，请重试');
    }
  };

  // 密码强度
  const passwordStrength = formData.password
    ? checkPasswordStrength(formData.password)
    : null;

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* 用户名 */}
      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium text-gray-700">
          用户名（可选）
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            placeholder="输入用户名"
            className={cn(
              'w-full rounded-lg border py-2.5 pl-10 pr-4 text-gray-900 placeholder-gray-400',
              'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
              'dark:bg-gray-800 dark:text-white dark:border-gray-700',
              fieldErrors.username ? 'border-red-500' : 'border-gray-300'
            )}
          />
        </div>
        {fieldErrors.username && (
          <p className="text-sm text-red-500">{fieldErrors.username}</p>
        )}
      </div>

      {/* 邮箱 */}
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          邮箱 <span className="text-red-500">*</span>
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
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          密码 <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            placeholder="至少 8 位，包含字母和数字"
            required
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
        {/* 密码强度指示器 */}
        {passwordStrength && formData.password.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  getPasswordStrengthColor(passwordStrength)
                )}
                style={{
                  width:
                    passwordStrength === 'weak'
                      ? '25%'
                      : passwordStrength === 'medium'
                      ? '50%'
                      : passwordStrength === 'strong'
                      ? '75%'
                      : '100%',
                }}
              />
            </div>
            <span className="text-xs text-gray-500">
              {getPasswordStrengthText(passwordStrength)}
            </span>
          </div>
        )}
      </div>

      {/* 确认密码 */}
      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
          确认密码 <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="再次输入密码"
            required
            className={cn(
              'w-full rounded-lg border py-2.5 pl-10 pr-12 text-gray-900 placeholder-gray-400',
              'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
              'dark:bg-gray-800 dark:text-white dark:border-gray-700',
              fieldErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
            )}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {fieldErrors.confirmPassword && (
          <p className="text-sm text-red-500">{fieldErrors.confirmPassword}</p>
        )}
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
            注册中...
          </span>
        ) : (
          '注册账号'
        )}
      </button>

      {/* 登录链接 */}
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        已有账号？{' '}
        <Link
          href="/login"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          立即登录
        </Link>
      </p>

      {/* 服务条款 */}
      <p className="text-center text-xs text-gray-500">
        注册即表示同意{' '}
        <Link href="/terms" className="text-blue-600 hover:underline">
          服务条款
        </Link>{' '}
        和{' '}
        <Link href="/privacy" className="text-blue-600 hover:underline">
          隐私政策
        </Link>
      </p>
    </form>
  );
}

export default RegisterForm;
