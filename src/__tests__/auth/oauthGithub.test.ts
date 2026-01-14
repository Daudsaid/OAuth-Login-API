import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import '../setup';
import {
  getGitHubAuthUrl,
  exchangeGitHubCode,
  getGitHubUserProfile,
  handleGitHubCallback,
} from '../../auth/oauthGithub';

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('GitHub OAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGitHubAuthUrl', () => {
    it('should generate correct GitHub authorization URL', () => {
      const state = 'test-state-token';
      const url = getGitHubAuthUrl(state);

      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=test-github-client-id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fgithub%2Fcallback');
      expect(url).toContain('scope=read%3Auser+user%3Aemail');
      expect(url).toContain(`state=${state}`);
      expect(url).toContain('allow_signup=true');
    });

    it('should properly encode URL parameters', () => {
      const state = 'state-with-special-chars-@#$';
      const url = getGitHubAuthUrl(state);

      expect(url).toContain(encodeURIComponent(state));
    });
  });

  describe('exchangeGitHubCode', () => {
    it('should successfully exchange code for access token', async () => {
      const mockResponse = {
        access_token: 'gho_test_access_token',
        token_type: 'bearer',
        scope: 'read:user,user:email',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const token = await exchangeGitHubCode('test-auth-code');

      expect(token).toBe('gho_test_access_token');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          }),
        })
      );
    });

    it('should throw error on failed token exchange', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid authorization code',
      } as Response);

      await expect(exchangeGitHubCode('invalid-code')).rejects.toThrow(
        'Failed to exchange GitHub code'
      );
    });

    it('should send correct parameters in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'test', token_type: 'bearer', scope: '' }),
      } as Response);

      await exchangeGitHubCode('test-code');

      const callArgs = mockFetch.mock.calls[0];
      const body = callArgs[1]?.body as string;

      expect(body).toContain('code=test-code');
      expect(body).toContain('client_id=test-github-client-id');
      expect(body).toContain('client_secret=test-github-client-secret');
      expect(body).toContain('redirect_uri=');
    });
  });

  describe('getGitHubUserProfile', () => {
    it('should fetch and return user profile successfully', async () => {
      const mockUserInfo = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: null,
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
      };

      const mockEmails = [
        {
          email: 'test@example.com',
          primary: true,
          verified: true,
          visibility: 'public',
        },
      ];

      // Mock both API calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserInfo,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEmails,
        } as Response);

      const profile = await getGitHubUserProfile('test-token');

      expect(profile).toEqual({
        providerId: '12345',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should use login as name if name is null', async () => {
      const mockUserInfo = {
        id: 12345,
        login: 'testuser',
        name: null,
        email: null,
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
      };

      const mockEmails = [
        {
          email: 'test@example.com',
          primary: true,
          verified: true,
          visibility: null,
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserInfo,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEmails,
        } as Response);

      const profile = await getGitHubUserProfile('test-token');

      expect(profile.name).toBe('testuser');
    });

    it('should throw error if no verified email found', async () => {
      const mockUserInfo = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: null,
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
      };

      const mockEmails = [
        {
          email: 'unverified@example.com',
          primary: true,
          verified: false,
          visibility: null,
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserInfo,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEmails,
        } as Response);

      await expect(getGitHubUserProfile('test-token')).rejects.toThrow(
        'No verified email found in GitHub account'
      );
    });

    it('should include correct authorization headers', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 1, login: 'test', name: 'Test', avatar_url: '' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ email: 'test@test.com', primary: true, verified: true, visibility: null }],
        } as Response);

      await getGitHubUserProfile('test-access-token');

      const userInfoCall = mockFetch.mock.calls[0];
      const emailsCall = mockFetch.mock.calls[1];

      expect(userInfoCall[1]?.headers).toMatchObject({
        Authorization: 'Bearer test-access-token',
        Accept: 'application/json',
        'User-Agent': 'OAuth-Login-API',
      });

      expect(emailsCall[1]?.headers).toMatchObject({
        Authorization: 'Bearer test-access-token',
        Accept: 'application/json',
        'User-Agent': 'OAuth-Login-API',
      });
    });
  });

  describe('handleGitHubCallback', () => {
    it('should complete full OAuth flow successfully', async () => {
      const mockTokenResponse = {
        access_token: 'gho_test_token',
        token_type: 'bearer',
        scope: 'read:user,user:email',
      };

      const mockUserInfo = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: null,
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
      };

      const mockEmails = [
        {
          email: 'test@example.com',
          primary: true,
          verified: true,
          visibility: 'public',
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserInfo,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEmails,
        } as Response);

      const profile = await handleGitHubCallback('test-auth-code');

      expect(profile).toEqual({
        providerId: '12345',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle errors during OAuth flow', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid code',
      } as Response);

      await expect(handleGitHubCallback('invalid-code')).rejects.toThrow(
        'Failed to exchange GitHub code'
      );
    });
  });
});
