/**
 * Global test setup and configuration
 * Mocks environment variables and external dependencies
 */

// Mock environment variables for all tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/google/callback';
process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret';
process.env.GITHUB_REDIRECT_URI = 'http://localhost:3000/auth/github/callback';
process.env.COOKIE_SECRET = 'test-cookie-secret-key-must-be-long-enough';

// Mock fetch globally for OAuth API calls
global.fetch = jest.fn();

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
