/**
 * 密码重置服务
 */

import { createServerClient } from '../supabase';
import { authAudit } from './audit-logger';

export interface PasswordResetResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * 发送密码重置邮件
 */
export async function sendPasswordResetEmail(
  email: string
): Promise<PasswordResetResult> {
  const serverClient = createServerClient();

  try {
    // 检查用户是否存在（不暴露结果）
    const { data: { users }, error: listError } = await serverClient.auth.admin.listUsers();
    
    if (listError) {
      return { success: false, error: '无法处理请求' };
    }

    const user = users.find((u) => u.email === email);

    // 记录尝试（无论用户是否存在）
    if (user) {
      await authAudit.logSecurityEvent(user.id, 'password_reset_requested', { email });
    }

    // 发送重置邮件
    const { error } = await serverClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: '如果邮箱存在，重置邮件已发送',
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '发送重置邮件失败';
    return { success: false, error: errorMessage };
  }
}

/**
 * 验证重置令牌
 */
export async function verifyResetToken(
  tokenHash: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const serverClient = createServerClient();

  try {
    const { data, error } = await serverClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    });

    if (error) {
      return { valid: false, error: error.message };
    }

    return { valid: true, userId: data.user?.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '验证令牌失败';
    return { valid: false, error: errorMessage };
  }
}

/**
 * 重置密码
 */
export async function resetPassword(
  userId: string,
  newPassword: string
): Promise<PasswordResetResult> {
  const serverClient = createServerClient();

  try {
    // 验证密码强度
    const strengthResult = validatePasswordStrength(newPassword);
    if (!strengthResult.valid) {
      return { success: false, error: strengthResult.message };
    }

    // 更新密码
    const { error } = await serverClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      await authAudit.logSecurityEvent(userId, 'password_reset_failed', {
        error: error.message,
      });
      return { success: false, error: error.message };
    }

    // 撤销所有会话
    await serverClient.auth.admin.signOut(userId, 'global');

    await authAudit.logSecurityEvent(userId, 'password_reset_completed', {});

    return {
      success: true,
      message: '密码重置成功，请使用新密码登录',
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '重置密码失败';
    return { success: false, error: errorMessage };
  }
}

/**
 * 修改密码（已登录用户）
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<PasswordResetResult> {
  const serverClient = createServerClient();

  try {
    // 获取用户信息
    const { data: { user }, error: userError } = await serverClient.auth.admin.getUserById(userId);
    if (userError || !user) {
      return { success: false, error: '用户不存在' };
    }

    // 验证当前密码
    const { error: signInError } = await serverClient.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      await authAudit.logSecurityEvent(userId, 'password_change_failed', {
        reason: 'invalid_current_password',
      });
      return { success: false, error: '当前密码错误' };
    }

    // 验证新密码强度
    const strengthResult = validatePasswordStrength(newPassword);
    if (!strengthResult.valid) {
      return { success: false, error: strengthResult.message };
    }

    // 更新密码
    const { error } = await serverClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    await authAudit.logSecurityEvent(userId, 'password_changed', {});

    return {
      success: true,
      message: '密码修改成功',
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '修改密码失败';
    return { success: false, error: errorMessage };
  }
}

/**
 * 验证密码强度
 */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string; score?: number } {
  if (password.length < 8) {
    return { valid: false, message: '密码长度至少 8 个字符' };
  }

  if (password.length > 128) {
    return { valid: false, message: '密码长度不能超过 128 个字符' };
  }

  // 计算密码强度
  let score = 0;
  
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  // 检查常见弱密码
  const weakPatterns = [
    'password',
    '123456',
    'qwerty',
    'abc123',
    'admin',
    'letmein',
    'welcome',
  ];

  const lowerPassword = password.toLowerCase();
  for (const pattern of weakPatterns) {
    if (lowerPassword.includes(pattern)) {
      return { valid: false, message: '密码包含常见弱密码模式', score };
    }
  }

  // 至少需要 3 种字符类型
  const hasTypes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ].filter(Boolean).length;

  if (hasTypes < 3) {
    return { valid: false, message: '密码需要包含大小写字母、数字和特殊字符中的至少 3 种', score };
  }

  return { valid: true, score };
}

/**
 * 检查密码是否在泄露列表中
 */
export async function checkPasswordBreach(password: string): Promise<{ breached: boolean; count?: number }> {
  try {
    // 使用 k-anonymity API 检查密码泄露
    const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    
    if (!response.ok) {
      // API 不可用时不阻止
      return { breached: false };
    }

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return { breached: true, count: parseInt(count.trim(), 10) };
      }
    }

    return { breached: false };
  } catch {
    // 检查失败时不阻止
    return { breached: false };
  }
}

import * as crypto from 'crypto';
