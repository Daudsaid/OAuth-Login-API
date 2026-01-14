import { Response } from 'express';
import { config } from '../config';

/**
 * Cookie options for session cookies
 */
export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
}

/**
 * Sets a session cookie with secure defaults
 *
 * @param res - Express response object
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Optional cookie configuration
 */
export function setSessionCookie(
  res: Response,
  name: string,
  value: string,
  options?: Partial<CookieOptions>
): void {
  const cookieOptions: CookieOptions = {
    httpOnly: true, // Prevents JavaScript access
    secure: config.isProduction, // HTTPS only in production
    sameSite: 'lax', // CSRF protection
    maxAge: config.cookie.maxAge, // 7 days
    path: '/',
    ...options,
  };

  res.cookie(name, value, cookieOptions);
}

/**
 * Sets a temporary state cookie for OAuth CSRF protection
 * Short-lived (10 minutes) and used only during OAuth flow
 *
 * @param res - Express response object
 * @param state - OAuth state value
 */
export function setOAuthStateCookie(res: Response, state: string): void {
  setSessionCookie(res, 'oauth_state', state, {
    maxAge: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Clears a cookie by setting it to expire immediately
 *
 * @param res - Express response object
 * @param name - Cookie name to clear
 */
export function clearCookie(res: Response, name: string): void {
  res.clearCookie(name, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Clears the session cookie
 *
 * @param res - Express response object
 */
export function clearSessionCookie(res: Response): void {
  clearCookie(res, config.session.cookieName);
}

/**
 * Clears the OAuth state cookie
 *
 * @param res - Express response object
 */
export function clearOAuthStateCookie(res: Response): void {
  clearCookie(res, 'oauth_state');
}
