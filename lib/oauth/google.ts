// Google OAuth Configuration
export const googleOAuthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback/google`,
  scopes: [
    'openid',
    'email',
    'profile',
  ].join(' '),
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
};

// Validate Google OAuth env vars
export function validateGoogleOAuthConfig(): {
  isValid: boolean;
  missingKeys: string[];
} {
  const requiredKeys = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
  const missingKeys = requiredKeys.filter(key => !process.env[key]);

  return {
    isValid: missingKeys.length === 0,
    missingKeys,
  };
}

// Generate Google OAuth authorization URL
export function getGoogleAuthUrl(state: string): string {
  const config = googleOAuthConfig;
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes,
    state,
    access_type: 'offline',
    prompt: 'consent',
  });
  return `${config.authUrl}?${params.toString()}`;
}