import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { generateRandomToken } from '../utils/crypto';
import { setOAuthStateCookie, clearOAuthStateCookie } from '../utils/cookies';
import { getGoogleAuthUrl, handleGoogleCallback } from './oauthGoogle';
import { getGitHubAuthUrl, handleGitHubCallback } from './oauthGithub';
import { findOrCreateUserFromOAuth } from './repo';
import { createUserSession, validateSession, revokeSession } from './sessions';
import { config } from '../config';
import type { User } from './repo';

const router = Router();

/**
 * Rate limiter for auth endpoints
 * Prevents brute force and abuse
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all auth routes
router.use(authLimiter);

/**
 * Middleware to require authentication
 * Validates session and attaches user to request
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionToken = req.cookies[config.session.cookieName];

    if (!sessionToken) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await validateSession(sessionToken);

    if (!user) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    // Attach user to request object for use in route handlers
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * GET /auth/google/start
 * Initiates Google OAuth flow
 */
router.get('/google/start', (req: Request, res: Response) => {
  try {
    // Generate random state for CSRF protection
    const state = generateRandomToken(32);

    // Store state in short-lived cookie
    setOAuthStateCookie(res, state);

    // Redirect to Google OAuth page
    const authUrl = getGoogleAuthUrl(state);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Google OAuth start error:', error);
    res.status(500).json({ error: 'Failed to initiate Google login' });
  }
});

/**
 * GET /auth/google/callback
 * Handles Google OAuth callback
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    // Validate required parameters
    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Missing authorization code' });
      return;
    }

    if (!state || typeof state !== 'string') {
      res.status(400).json({ error: 'Missing state parameter' });
      return;
    }

    // Validate state to prevent CSRF attacks
    const storedState = req.cookies.oauth_state;
    if (!storedState || storedState !== state) {
      res.status(400).json({ error: 'Invalid state parameter' });
      return;
    }

    // Clear the state cookie
    clearOAuthStateCookie(res);

    // Exchange code for user profile
    const profile = await handleGoogleCallback(code);

    // Find or create user
    const user = await findOrCreateUserFromOAuth({
      provider: 'google',
      providerUserId: profile.providerId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    });

    // Create session
    await createUserSession(res, user.id);

    // TODO: Redirect to your frontend success page
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    clearOAuthStateCookie(res);

    // Provide more detailed error message in development
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const detailedError = config.nodeEnv === 'development'
      ? { error: 'Google login failed', details: errorMessage }
      : { error: 'Google login failed' };

    res.status(500).json(detailedError);
  }
});

/**
 * GET /auth/github/start
 * Initiates GitHub OAuth flow
 */
router.get('/github/start', (req: Request, res: Response) => {
  try {
    // Generate random state for CSRF protection
    const state = generateRandomToken(32);

    // Store state in short-lived cookie
    setOAuthStateCookie(res, state);

    // Redirect to GitHub OAuth page
    const authUrl = getGitHubAuthUrl(state);
    res.redirect(authUrl);
  } catch (error) {
    console.error('GitHub OAuth start error:', error);
    res.status(500).json({ error: 'Failed to initiate GitHub login' });
  }
});

/**
 * GET /auth/github/callback
 * Handles GitHub OAuth callback
 */
router.get('/github/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    // Validate required parameters
    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Missing authorization code' });
      return;
    }

    if (!state || typeof state !== 'string') {
      res.status(400).json({ error: 'Missing state parameter' });
      return;
    }

    // Validate state to prevent CSRF attacks
    const storedState = req.cookies.oauth_state;
    if (!storedState || storedState !== state) {
      res.status(400).json({ error: 'Invalid state parameter' });
      return;
    }

    // Clear the state cookie
    clearOAuthStateCookie(res);

    // Exchange code for user profile
    const profile = await handleGitHubCallback(code);

    // Find or create user
    const user = await findOrCreateUserFromOAuth({
      provider: 'github',
      providerUserId: profile.providerId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    });

    // Create session
    await createUserSession(res, user.id);

    // TODO: Redirect to your frontend success page
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    clearOAuthStateCookie(res);

    // Provide more detailed error message in development
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const detailedError = config.nodeEnv === 'development'
      ? { error: 'GitHub login failed', details: errorMessage }
      : { error: 'GitHub login failed' };

    res.status(500).json(detailedError);
  }
});

/**
 * POST /auth/logout
 * Logs out the current user
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const sessionToken = req.cookies[config.session.cookieName];

    if (sessionToken) {
      await revokeSession(res, sessionToken);
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * GET /me
 * Returns the currently authenticated user
 * Protected route - requires authentication
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    created_at: user.created_at,
  });
});

export default router;
