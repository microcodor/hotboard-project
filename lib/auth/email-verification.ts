/**
 * 邮箱验证服务
 */

import { createServerClient } from '../supabase';
import { usersDb } from '../db/users';
import { authAudit } from './audit-logger';

export interface VerificationStatus {
  isVerified: boolean;
  verifiedAt?: string;
  email?: string;
}

export interface VerificationResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * 发送验证邮件
 */
export async function sendVerificationEmail(
  userId: string,
  email: string
): Promise<VerificationResult> {
  const serverClient = createServerClient();

  try {
    const { error } = await serverClient.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email`,
      },
    });

    if (error) {
      await authAudit.logSecurityEvent(userId, 'verification_email_failed', {
        email,
        error: error.message,
      });
      return { success: false, error: error.message };
    }

    await authAudit.logSecurityEvent(userId, 'verification_email_sent', { email });

    return {
      success: true,
      message: '验证邮件已发送，请查收',
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '发送验证邮件失败';
    return { success: false, error: errorMessage };
  }
}

/**
 * 验证邮箱
 */
export async function verifyEmail(
  tokenHash: string,
  type: string
): Promise<VerificationResult> {
  const serverClient = createServerClient();

  try {
    const { data, error } = await serverClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'signup' | 'email_change',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      await authAudit.logSecurityEvent(data.user.id, 'email_verified', {
        email: data.user.email,
      });
    }

    return {
      success: true,
      message: '邮箱验证成功',
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '邮箱验证失败';
    return { success: false, error: errorMessage };
  }
}

/**
 * 获取验证状态
 */
export async function getVerificationStatus(
  userId: string
): Promise<VerificationStatus> {
  const serverClient = createServerClient();

  try {
    const { data: { user }, error } = await serverClient.auth.admin.getUserById(userId);

    if (error || !user) {
      return { isVerified: false };
    }

    return {
      isVerified: user.email_confirmed_at != null,
      verifiedAt: user.email_confirmed_at || undefined,
      email: user.email,
    };
  } catch {
    return { isVerified: false };
  }
}

/**
 * 重发验证邮件（带频率限制）
 */
export async function resendVerificationEmail(
  email: string
): Promise<VerificationResult> {
  const serverClient = createServerClient();

  try {
    // 检查用户是否存在
    const { data: { users }, error: listError } = await serverClient.auth.admin.listUsers();

    if (listError) {
      return { success: false, error: '无法验证用户状态' };
    }

    const user = users.find((u) => u.email === email);
    if (!user) {
      // 不暴露用户是否存在
      return { success: true, message: '如果邮箱存在，验证邮件已发送' };
    }

    // 检查是否已验证
    if (user.email_confirmed_at) {
      return { success: false, error: '邮箱已验证' };
    }

    // 检查最近发送时间（防止频繁发送）
    const lastEmailSent = user.user_metadata?.last_verification_email;
    if (lastEmailSent) {
      const cooldownMs = 60 * 1000; // 1 分钟冷却
      const timeSinceLastEmail = Date.now() - new Date(lastEmailSent).getTime();
      if (timeSinceLastEmail < cooldownMs) {
        const waitSeconds = Math.ceil((cooldownMs - timeSinceLastEmail) / 1000);
        return {
          success: false,
          error: `请等待 ${waitSeconds} 秒后再试`,
        };
      }
    }

    // 发送验证邮件
    const { error } = await serverClient.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email`,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // 更新最后发送时间
    await serverClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        last_verification_email: new Date().toISOString(),
      },
    });

    await authAudit.logSecurityEvent(user.id, 'verification_email_resent', { email });

    return {
      success: true,
      message: '验证邮件已发送，请查收',
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '发送验证邮件失败';
    return { success: false, error: errorMessage };
  }
}

/**
 * 更换邮箱（需要验证）
 */
export async function initiateEmailChange(
  userId: string,
  newEmail: string
): Promise<VerificationResult> {
  const serverClient = createServerClient();

  try {
    const { error } = await serverClient.auth.admin.updateUserById(userId, {
      email: newEmail,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    await authAudit.logSecurityEvent(userId, 'email_change_initiated', {
      newEmail,
    });

    return {
      success: true,
      message: '验证邮件已发送到新邮箱，请查收并确认',
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '更换邮箱失败';
    return { success: false, error: errorMessage };
  }
}
