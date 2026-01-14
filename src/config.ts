import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Validates that a required environment variable exists
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Application configuration
 * All required environment variables are validated at startup
 */
export const config = {
  // Server configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  isProduction: process.env.NODE_ENV === 'production',

  // Database configuration
  database: {
    url: requireEnv('DATABASE_URL'),
  },

  // Google OAuth configuration
  google: {
    clientId: requireEnv('GOOGLE_CLIENT_ID'),
    clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
    redirectUri: requireEnv('GOOGLE_REDIRECT_URI'),
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'profile', 'email'],
  },

  // GitHub OAuth configuration
  github: {
    clientId: requireEnv('GITHUB_CLIENT_ID'),
    clientSecret: requireEnv('GITHUB_CLIENT_SECRET'),
    redirectUri: requireEnv('GITHUB_REDIRECT_URI'),
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    userEmailsUrl: 'https://api.github.com/user/emails',
    scopes: ['read:user', 'user:email'],
  },

  // Session configuration
  session: {
    cookieName: process.env.SESSION_COOKIE_NAME || 'session_token',
    cookieSecret: requireEnv('COOKIE_SECRET'),
    expiryDays: 7,
    // Session expires in 7 days (in milliseconds)
    get expiryMs(): number {
      return this.expiryDays * 24 * 60 * 60 * 1000;
    },
  },

  // Cookie configuration
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  },
};

/**
 * Validates all required configuration on startup
 * Throws an error if any required values are missing
 */
export function validateConfig(): void {
  try {
    // This will throw if any required env vars are missing
    const requiredKeys = [
      'DATABASE_URL',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_REDIRECT_URI',
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
      'GITHUB_REDIRECT_URI',
      'COOKIE_SECRET',
    ];

    const missing = requiredKeys.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}\n` +
          'Please check your .env file against .env.example'
      );
    }

    console.log('✓ Configuration validated successfully');
  } catch (error) {
    console.error('Configuration validation failed:', error);
    throw error;
  }
}
