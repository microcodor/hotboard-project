// GitHub OAuth Configuration
export const githubOAuthConfig = {
  clientId: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback/github`,
  scopes: ['read:user', 'user:email'],
  authUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userInfoUrl: 'https://api.github.com/user',
};

// Validate GitHub OAuth env vars
export function validateGithubOAuthConfig(): {
  isValid: boolean;
  missingKeys: string[];
} {
  const requiredKeys = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'];
  const missingKeys = requiredKeys.filter(key => !process.env[key]);

  return {
    isValid: missingKeys.length === 0,
    missingKeys,
  };
}

// Generate GitHub OAuth authorization URL
export function getGithubAuthUrl(state: string): string {
  const config = githubOAuthConfig;
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state,
  });
  return `${config.authUrl}?${params.toString()}`;
}