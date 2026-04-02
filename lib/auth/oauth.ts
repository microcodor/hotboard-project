/**
 * OAuth 登录处理
 * 支持 Google 和 GitHub OAuth
 */

import { supabase, createServerClient } from '../supabase';
import { OAUTH_PROVIDERS, type OAuthProvider, type OAuthState, type OAuthCallbackResult } from './oauth-config';
import { usersDb } from '../db/users';
import { authAudit } from './audit-logger';

/**
 * 生成 OAuth 登录 URL
 */
export async function getOAuthUrl(
  provider: OAuthProvider,
  state?: OAuthState
): Promise<{ url: string; error?: never } | { url?: never; error: string }> {
  try {
    const config = OAUTH_PROVIDERS[provider];
    if (!config) {
      return { error: `不支持的 OAuth 提供商: ${provider}` };
    }

    // 构建状态参数
    const stateParam = state ? btoa(JSON.stringify(state)) : undefined;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as 'google' | 'github',
      options: {
        scopes: config.scopes.join(' '),
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback/${provider}`,
        queryParams: stateParam ? { state: stateParam } : undefined,
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { url: data.url };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'OAuth 初始化失败';
    return { error: errorMessage };
  }
}

/**
 * 处理 OAuth 回调
 */
export async function handleOAuthCallback(
  provider: OAuthProvider,
  code: string,
  state?: string
): Promise<OAuthCallbackResult> {
  const serverClient = createServerClient();

  try {
    // 交换授权码获取会话
    const { data: { session }, error: sessionError } = await serverClient.auth.exchangeCodeForSession(code);

    if (sessionError || !session) {
      await authAudit.logOAuthAttempt(provider, false, undefined, sessionError?.message);
      return {
        success: false,
        isNewUser: false,
        user: null,
        error: sessionError?.message || 'OAuth 认证失败',
      };
    }

    const user = session.user;
    const isNewUser = !user.user_metadata?.profile_created;

    // 检查邮箱验证状态
    const emailVerified = user.email_confirmed_at != null;

    // 如果是新用户，创建用户资料
    if (isNewUser) {
      const profileResult = await usersDb.createProfile(
        user.id,
        user.email!,
        user.user_metadata?.full_name || user.user_metadata?.name
      );

      if (profileResult.error) {
        console.error('创建用户资料失败:', profileResult.error);
      }

      // 标记资料已创建
      await serverClient.auth.updateUser({
        data: { profile_created: true },
      });
    }

    // 解析状态参数
    let redirectTo: string | undefined;
    if (state) {
      try {
        const stateData = JSON.parse(atob(state)) as OAuthState;
        redirectTo = stateData.redirectTo;
      } catch {
        // 忽略无效的状态参数
      }
    }

    // 记录审计日志
    await authAudit.logOAuthAttempt(provider, true, user.id);
    await authAudit.logLogin(user.id, true, 'oauth');

    return {
      success: true,
      isNewUser,
      user: {
        id: user.id,
        email: user.email!,
        emailVerified,
      },
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'OAuth 回调处理失败';
    await authAudit.logOAuthAttempt(provider, false, undefined, errorMessage);
    return {
      success: false,
      isNewUser: false,
      user: null,
      error: errorMessage,
    };
  }
}

/**
 * 关联 OAuth 账号到已有账号
 */
export async function linkOAuthAccount(
  provider: OAuthProvider,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const serverClient = createServerClient();

  try {
    const config = OAUTH_PROVIDERS[provider];
    if (!config) {
      return { success: false, error: `不支持的 OAuth 提供商: ${provider}` };
    }

    // 获取当前用户的身份提供商
    const { data: { identities }, error: identitiesError } = await serverClient.auth.getUserIdentities();

    if (identitiesError) {
      return { success: false, error: identitiesError.message };
    }

    // 检查是否已经关联
    const existingIdentity = identities?.find(
      (identity) => identity.provider === provider
    );

    if (existingIdentity) {
      return { success: false, error: '该 OAuth 账号已经关联' };
    }

    // 发起关联流程
    const { data, error } = await serverClient.auth.signInWithOAuth({
      provider: provider as 'google' | 'github',
      options: {
        scopes: config.scopes.join(' '),
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/link/${provider}`,
        queryParams: {
          link_to: userId,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '关联 OAuth 账号失败';
    return { success: false, error: errorMessage };
  }
}

/**
 * 解除 OAuth 账号关联
 */
export async function unlinkOAuthAccount(
  provider: OAuthProvider,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const serverClient = createServerClient();

  try {
    // 获取用户身份
    const { data: { identities }, error: identitiesError } = await serverClient.auth.getUserIdentities();

    if (identitiesError) {
      return { success: false, error: identitiesError.message };
    }

    // 查找要解除的身份
    const identity = identities?.find(
      (id) => id.provider === provider
    );

    if (!identity) {
      return { success: false, error: '未找到该 OAuth 账号关联' };
    }

    // 确保至少保留一个登录方式
    if (identities && identities.length <= 1) {
      // 检查是否有密码登录
      const { data: user } = await serverClient.auth.getUser();
      if (!user.user?.encrypted_password) {
        return { success: false, error: '无法解除最后一个登录方式，请先设置密码' };
      }
    }

    // 解除关联
    const { error } = await serverClient.auth.unlinkIdentity(identity);

    if (error) {
      return { success: false, error: error.message };
    }

    await authAudit.logSecurityEvent(userId, 'oauth_unlinked', { provider });

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '解除 OAuth 关联失败';
    return { success: false, error: errorMessage };
  }
}
