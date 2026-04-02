/**
 * 表单验证规则 - 使用 Zod
 */
import { z } from 'zod';

// 密码验证规则
const passwordSchema = z
  .string()
  .min(8, '密码至少需要 8 个字符')
  .max(100, '密码最多 100 个字符')
  .regex(/[a-zA-Z]/, '密码必须包含至少一个字母')
  .regex(/[0-9]/, '密码必须包含至少一个数字');

// 邮箱验证规则
const emailSchema = z
  .string()
  .email('请输入有效的邮箱地址')
  .min(1, '邮箱不能为空')
  .max(255, '邮箱最多 255 个字符');

// 用户名验证规则
const usernameSchema = z
  .string()
  .min(2, '用户名至少需要 2 个字符')
  .max(20, '用户名最多 20 个字符')
  .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, '用户名只能包含字母、数字、下划线和中文');

// 注册表单验证
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, '请确认密码'),
  username: usernameSchema.optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

// 登录表单验证
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '请输入密码'),
  rememberMe: z.boolean().optional(),
});

// 忘记密码表单验证
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// 重置密码表单验证
export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string().min(1, '请确认密码'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

// 修改密码表单验证
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, '请确认新密码'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

// 个人资料更新验证
export const profileSchema = z.object({
  display_name: z.string().max(50, '昵称最多 50 个字符').optional(),
  avatar_url: z.string().url('请输入有效的头像链接').optional().or(z.literal('')),
  bio: z.string().max(200, '个人简介最多 200 个字符').optional(),
});

// 类型导出
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

// 验证辅助函数
export function validateRegister(data: unknown) {
  return registerSchema.safeParse(data);
}

export function validateLogin(data: unknown) {
  return loginSchema.safeParse(data);
}

export function validateForgotPassword(data: unknown) {
  return forgotPasswordSchema.safeParse(data);
}

export function validateResetPassword(data: unknown) {
  return resetPasswordSchema.safeParse(data);
}

export function validateChangePassword(data: unknown) {
  return changePasswordSchema.safeParse(data);
}

export function validateProfile(data: unknown) {
  return profileSchema.safeParse(data);
}

// 字段级验证（用于实时验证）
export function validateField(schema: z.ZodTypeAny, value: unknown): string | null {
  const result = schema.safeParse(value);
  if (result.success) {
    return null;
  }
  return result.error.errors[0]?.message || '验证失败';
}

// 密码强度检测
export type PasswordStrength = 'weak' | 'medium' | 'strong' | 'very-strong';

export function checkPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 2) return 'weak';
  if (score <= 3) return 'medium';
  if (score <= 4) return 'strong';
  return 'very-strong';
}

export function getPasswordStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return 'bg-red-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'strong':
      return 'bg-green-500';
    case 'very-strong':
      return 'bg-emerald-600';
  }
}

export function getPasswordStrengthText(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return '弱';
    case 'medium':
      return '中等';
    case 'strong':
      return '强';
    case 'very-strong':
      return '非常强';
  }
}
