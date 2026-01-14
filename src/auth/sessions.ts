import { Response } from 'express';
import { generateRandomToken, hashToken } from '../utils/crypto';
import { setSessionCookie, clearSessionCookie } from '../utils/cookies';
import { createSession, findSessionByTokenHash, deleteSessionByTokenHash } from './repo';
import { config } from '../config';
import type { User } from './repo';

/**
 * Creates a new session for a user and sets the session cookie
 *
 * @param res - Express response object
 * @param userId - User ID to create session for
 * @returns The created session token (raw, unhashed)
 */
export async function createUserSession(res: Response, userId: number): Promise<string> {
  // Generate a random session token
  const sessionToken = generateRandomToken(32);

  // Hash the token before storing in database
  const tokenHash = hashToken(sessionToken);

  // Calculate expiration date
  const expiresAt = new Date(Date.now() + config.session.expiryMs);

  // Store session in database
  await createSession(userId, tokenHash, expiresAt);

  // Set the session cookie with the raw token
  setSessionCookie(res, config.session.cookieName, sessionToken);

  return sessionToken;
}

/**
 * Validates a session token and returns the associated user
 *
 * @param sessionToken - Raw session token from cookie
 * @returns User object if session is valid, null otherwise
 */
export async function validateSession(sessionToken: string): Promise<User | null> {
  if (!sessionToken) {
    return null;
  }

  // Hash the token to compare with database
  const tokenHash = hashToken(sessionToken);

  // Find session in database
  const sessionData = await findSessionByTokenHash(tokenHash);

  if (!sessionData) {
    return null;
  }

  // Session is valid, return user
  return sessionData.user;
}

/**
 * Revokes a session by deleting it from the database and clearing the cookie
 *
 * @param res - Express response object
 * @param sessionToken - Raw session token from cookie
 */
export async function revokeSession(res: Response, sessionToken: string): Promise<void> {
  if (sessionToken) {
    const tokenHash = hashToken(sessionToken);
    await deleteSessionByTokenHash(tokenHash);
  }

  // Clear the session cookie
  clearSessionCookie(res);
}
