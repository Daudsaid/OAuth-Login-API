-- OAuth Login API Database Schema
-- PostgreSQL database schema for OAuth authentication with sessions

-- Drop existing tables if they exist (be careful in production!)
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS oauth_accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
-- Stores core user information
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- OAuth accounts table
-- Links users to their OAuth provider accounts (Google, GitHub, etc.)
CREATE TABLE oauth_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Ensure one OAuth account per provider per user
  UNIQUE(provider, provider_user_id)
);

-- Create indexes for faster OAuth lookups
CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX idx_oauth_accounts_provider ON oauth_accounts(provider, provider_user_id);

-- Sessions table
-- Stores active user sessions with hashed tokens
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for faster session lookups and cleanup
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Add comments for documentation
COMMENT ON TABLE users IS 'Core user accounts';
COMMENT ON TABLE oauth_accounts IS 'OAuth provider account links';
COMMENT ON TABLE sessions IS 'Active user sessions with hashed tokens';

COMMENT ON COLUMN users.email IS 'User email address (unique)';
COMMENT ON COLUMN users.name IS 'User display name';
COMMENT ON COLUMN users.avatar_url IS 'URL to user profile picture';

COMMENT ON COLUMN oauth_accounts.provider IS 'OAuth provider name (google, github, etc.)';
COMMENT ON COLUMN oauth_accounts.provider_user_id IS 'User ID from the OAuth provider';

COMMENT ON COLUMN sessions.token_hash IS 'SHA-256 hash of the session token';
COMMENT ON COLUMN sessions.expires_at IS 'Session expiration timestamp';

-- Optional: Create a function to automatically clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions WHERE expires_at <= NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_sessions IS 'Deletes all expired sessions and returns count';

-- Print success message
DO $$
BEGIN
  RAISE NOTICE 'Database schema created successfully!';
  RAISE NOTICE 'Tables: users, oauth_accounts, sessions';
  RAISE NOTICE 'Run this command to set up the database:';
  RAISE NOTICE '  psql $DATABASE_URL -f schema.sql';
END $$;
