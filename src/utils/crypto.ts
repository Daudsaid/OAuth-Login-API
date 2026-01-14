import crypto from 'crypto';

/**
 * Generates a cryptographically secure random string
 * Used for session tokens and OAuth state parameters
 *
 * @param bytes - Number of random bytes to generate (default: 32)
 * @returns Base64 URL-safe encoded string
 */
export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Generates a SHA-256 hash of the input string
 * Used for hashing session tokens before storing in database
 *
 * @param input - The string to hash
 * @returns Hexadecimal hash string
 */
export function hashToken(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Compares two strings in constant time to prevent timing attacks
 * Used for validating session tokens
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal, false otherwise
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
