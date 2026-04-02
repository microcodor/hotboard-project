// OAuth configuration index - re-exports all OAuth providers
export { googleOAuthConfig, validateGoogleOAuthConfig, getGoogleAuthUrl } from './google';
export { githubOAuthConfig, validateGithubOAuthConfig, getGithubAuthUrl } from './github';

// Provider type
export type OAuthProvider = 'google' | 'github';

// Validate all OAuth configs
export function validateOAuthConfigs(): Record<OAuthProvider, { isValid: boolean; missingKeys: string[] }> {
  return {
    google: validateGoogleOAuthConfig(),
    github: validateGithubOAuthConfig(),
  };
}

// Get auth URL for a provider
export function getOAuthUrl(provider: OAuthProvider, state: string): string {
  switch (provider) {
    case 'google':
      return getGoogleAuthUrl(state);
    case 'github':
      return getGithubAuthUrl(state);
    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
}