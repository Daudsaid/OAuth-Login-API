import { pool } from '../db';

/**
 * Database types
 */
export interface User {
  id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OAuthAccount {
  id: number;
  user_id: number;
  provider: string;
  provider_user_id: string;
  created_at: Date;
}

export interface Session {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

/**
 * Find a user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query<User>(
    'SELECT * FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  return result.rows[0] || null;
}

/**
 * Find a user by ID
 */
export async function findUserById(userId: number): Promise<User | null> {
  const result = await pool.query<User>(
    'SELECT * FROM users WHERE id = $1 LIMIT 1',
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Create a new user
 */
export async function createUser(data: {
  email: string;
  name: string | null;
  avatar_url: string | null;
}): Promise<User> {
  const result = await pool.query<User>(
    `INSERT INTO users (email, name, avatar_url, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING *`,
    [data.email, data.name, data.avatar_url]
  );
  return result.rows[0];
}

/**
 * Update user profile information
 */
export async function updateUser(
  userId: number,
  data: {
    name?: string | null;
    avatar_url?: string | null;
  }
): Promise<User> {
  const result = await pool.query<User>(
    `UPDATE users
     SET name = COALESCE($2, name),
         avatar_url = COALESCE($3, avatar_url),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [userId, data.name, data.avatar_url]
  );
  return result.rows[0];
}

/**
 * Find an OAuth account by provider and provider user ID
 */
export async function findOAuthAccount(
  provider: string,
  providerUserId: string
): Promise<OAuthAccount | null> {
  const result = await pool.query<OAuthAccount>(
    'SELECT * FROM oauth_accounts WHERE provider = $1 AND provider_user_id = $2 LIMIT 1',
    [provider, providerUserId]
  );
  return result.rows[0] || null;
}

/**
 * Create a new OAuth account and link it to a user
 */
export async function createOAuthAccount(data: {
  user_id: number;
  provider: string;
  provider_user_id: string;
}): Promise<OAuthAccount> {
  const result = await pool.query<OAuthAccount>(
    `INSERT INTO oauth_accounts (user_id, provider, provider_user_id, created_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING *`,
    [data.user_id, data.provider, data.provider_user_id]
  );
  return result.rows[0];
}

/**
 * Find or create a user via OAuth
 * This is the main function used during OAuth login
 */
export async function findOrCreateUserFromOAuth(params: {
  provider: string;
  providerUserId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}): Promise<User> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if OAuth account already exists
    let oauthAccount = await client
      .query<OAuthAccount>(
        'SELECT * FROM oauth_accounts WHERE provider = $1 AND provider_user_id = $2 LIMIT 1',
        [params.provider, params.providerUserId]
      )
      .then((res) => res.rows[0] || null);

    let user: User;

    if (oauthAccount) {
      // OAuth account exists, fetch the user
      const userResult = await client.query<User>(
        'SELECT * FROM users WHERE id = $1 LIMIT 1',
        [oauthAccount.user_id]
      );
      user = userResult.rows[0];

      // Update user info if changed
      if (params.name || params.avatarUrl) {
        const updateResult = await client.query<User>(
          `UPDATE users
           SET name = COALESCE($2, name),
               avatar_url = COALESCE($3, avatar_url),
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [user.id, params.name, params.avatarUrl]
        );
        user = updateResult.rows[0];
      }
    } else {
      // New OAuth login, check if user exists by email
      let existingUser = await client
        .query<User>('SELECT * FROM users WHERE email = $1 LIMIT 1', [params.email])
        .then((res) => res.rows[0] || null);

      if (existingUser) {
        // User exists, link OAuth account
        user = existingUser;
      } else {
        // Create new user
        const userResult = await client.query<User>(
          `INSERT INTO users (email, name, avatar_url, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           RETURNING *`,
          [params.email, params.name, params.avatarUrl]
        );
        user = userResult.rows[0];
      }

      // Create OAuth account link
      await client.query(
        `INSERT INTO oauth_accounts (user_id, provider, provider_user_id, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [user.id, params.provider, params.providerUserId]
      );
    }

    await client.query('COMMIT');
    return user;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create a new session
 */
export async function createSession(
  userId: number,
  tokenHash: string,
  expiresAt: Date
): Promise<Session> {
  const result = await pool.query<Session>(
    `INSERT INTO sessions (user_id, token_hash, expires_at, created_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING *`,
    [userId, tokenHash, expiresAt]
  );
  return result.rows[0];
}

/**
 * Find a session by token hash
 */
export async function findSessionByTokenHash(
  tokenHash: string
): Promise<(Session & { user: User }) | null> {
  const result = await pool.query<Session & { user: User }>(
    `SELECT s.*, row_to_json(u.*)::json as user
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  
  if (!result.rows[0]) {
    return null;
  }
  
  // The user field comes as JSON from row_to_json, ensure it's properly typed
  const row = result.rows[0];
  return {
    ...row,
    user: row.user as User,
  };
}

/**
 * Delete a session by token hash (logout)
 */
export async function deleteSessionByTokenHash(tokenHash: string): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
}

/**
 * Delete all expired sessions (cleanup)
 */
export async function deleteExpiredSessions(): Promise<number> {
  const result = await pool.query('DELETE FROM sessions WHERE expires_at <= NOW()');
  return result.rowCount || 0;
}

/**
 * Delete all sessions for a user (logout from all devices)
 */
export async function deleteAllUserSessions(userId: number): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}
