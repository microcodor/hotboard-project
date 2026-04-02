/**
 * 重置密码页面
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { resetPasswordSchema, checkPasswordStrength, getPasswordStrengthColor, getPasswordStrengthText } from '@/lib/validation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setSubmitError(null);
  };

  const validateForm = (): boolean => {
    try {
      resetPasswordSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err: any) {
      const errors: Record<string, string> = {};
      err.errors?.forEach((e: any) => {
        if (e.path[0]) {
          errors[e.path[0]] = e.message;
        }
      });
      setErrors(errors);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitError(null);

    const result = await updatePassword(formData.password);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } else {
      setSubmitError(result.error || '重置失败，请重试');
    }
  };

  const passwordStrength = formData.password
    ? checkPasswordStrength(formData.password)
    : null;

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              密码重置成功
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              您的密码已成功重置，即将跳转到登录页面...
            </p>
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
            重置密码
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            请输入您的新密码
          </p>
        </div>

        {/* 表单卡片 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 新密码 */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                新密码
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
                    errors.password ? 'border-red-500' : 'border-gray-300'
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
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
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
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                确认密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="再次输入新密码"
                  required
                  className={cn(
                    'w-full rounded-lg border py-2.5 pl-10 pr-12 text-gray-900 placeholder-gray-400',
                    'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                    'dark:bg-gray-800 dark:text-white dark:border-gray-700',
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
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
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
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
                  重置中...
                </span>
              ) : (
                '重置密码'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
