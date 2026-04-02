/**
 * OAuth 提供商配置
 */

export type OAuthProvider = 'google' | 'github';

export interface OAuthConfig {
  provider: OAuthProvider;
  name: string;
  icon: string;
  scopes: string[];
}

export const OAUTH_PROVIDERS: Record<OAuthProvider, OAuthConfig> = {
  google: {
    provider: 'google',
    name: 'Google',
    icon: 'google',
    scopes: ['email', 'profile'],
  },
  github: {
    provider: 'github',
    name: 'GitHub',
    icon: 'github',
    scopes: ['user:email'],
  },
};

export interface OAuthState {
  redirectTo?: string;
  linkToAccount?: string; // 用于关联已有账号
}

export interface OAuthCallbackResult {
  success: boolean;
  isNewUser: boolean;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
  } | null;
  error?: string;
}
