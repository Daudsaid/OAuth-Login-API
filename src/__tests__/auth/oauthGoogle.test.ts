import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import '../setup';
import {
  getGoogleAuthUrl,
  exchangeGoogleCode,
  getGoogleUserProfile,
  handleGoogleCallback,
} from '../../auth/oauthGoogle';

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('Google OAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGoogleAuthUrl', () => {
    it('should generate correct Google authorization URL', () => {
      const state = 'test-state-token';
      const url = getGoogleAuthUrl(state);

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-google-client-id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fgoogle%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=openid+profile+email');
      expect(url).toContain(`state=${state}`);
      expect(url).toContain('access_type=online');
      expect(url).toContain('prompt=select_account');
    });

    it('should properly encode URL parameters', () => {
      const state = 'state-with-special-chars-@#$';
      const url = getGoogleAuthUrl(state);

      expect(url).toContain(encodeURIComponent(state));
    });

    it('should include all required OAuth parameters', () => {
      const state = 'test-state';
      const url = new URL(getGoogleAuthUrl(state));
      const params = url.searchParams;

      expect(params.get('client_id')).toBe('test-google-client-id');
      expect(params.get('response_type')).toBe('code');
      expect(params.get('state')).toBe(state);
      expect(params.get('access_type')).toBe('online');
      expect(params.get('prompt')).toBe('select_account');
    });
  });

  describe('exchangeGoogleCode', () => {
    it('should successfully exchange code for access token', async () => {
      const mockResponse = {
        access_token: 'ya29.test_access_token',
        expires_in: 3599,
        token_type: 'Bearer',
        scope: 'openid profile email',
        id_token: 'eyJhbGc...',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const token = await exchangeGoogleCode('test-auth-code');

      expect(token).toBe('ya29.test_access_token');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );
    });

    it('should throw error on failed token exchange', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid authorization code',
      } as Response);

      await expect(exchangeGoogleCode('invalid-code')).rejects.toThrow(
        'Failed to exchange Google code'
      );
    });

    it('should send correct parameters in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: ''
        }),
      } as Response);

      await exchangeGoogleCode('test-code');

      const callArgs = mockFetch.mock.calls[0];
      const body = callArgs[1]?.body as string;

      expect(body).toContain('code=test-code');
      expect(body).toContain('client_id=test-google-client-id');
      expect(body).toContain('client_secret=test-google-client-secret');
      expect(body).toContain('redirect_uri=');
      expect(body).toContain('grant_type=authorization_code');
    });
  });

  describe('getGoogleUserProfile', () => {
    it('should fetch and return user profile successfully', async () => {
      const mockProfile = {
        id: '12345678901234567890',
        email: 'test@example.com',
        verified_email: true,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://lh3.googleusercontent.com/a/test-photo',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      } as Response);

      const profile = await getGoogleUserProfile('test-token');

      expect(profile).toEqual({
        providerId: '12345678901234567890',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://lh3.googleusercontent.com/a/test-photo',
      });
    });

    it('should throw error if email is not verified', async () => {
      const mockProfile = {
        id: '12345',
        email: 'test@example.com',
        verified_email: false,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/photo.jpg',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      } as Response);

      await expect(getGoogleUserProfile('test-token')).rejects.toThrow(
        'Google email is not verified'
      );
    });

    it('should throw error if API request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Unauthorized',
      } as Response);

      await expect(getGoogleUserProfile('invalid-token')).rejects.toThrow(
        'Failed to fetch Google user profile'
      );
    });

    it('should include correct authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: '123',
          email: 'test@test.com',
          verified_email: true,
          name: 'Test',
          given_name: 'Test',
          family_name: 'User',
          picture: 'https://example.com/photo.jpg',
        }),
      } as Response);

      await getGoogleUserProfile('test-access-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-access-token',
          },
        })
      );
    });
  });

  describe('handleGoogleCallback', () => {
    it('should complete full OAuth flow successfully', async () => {
      const mockTokenResponse = {
        access_token: 'ya29.test_token',
        expires_in: 3599,
        token_type: 'Bearer',
        scope: 'openid profile email',
      };

      const mockProfile = {
        id: '12345678901234567890',
        email: 'test@example.com',
        verified_email: true,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://lh3.googleusercontent.com/a/test-photo',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProfile,
        } as Response);

      const profile = await handleGoogleCallback('test-auth-code');

      expect(profile).toEqual({
        providerId: '12345678901234567890',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://lh3.googleusercontent.com/a/test-photo',
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during OAuth flow', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid code',
      } as Response);

      await expect(handleGoogleCallback('invalid-code')).rejects.toThrow(
        'Failed to exchange Google code'
      );
    });

    it('should reject unverified emails', async () => {
      const mockTokenResponse = {
        access_token: 'test_token',
        expires_in: 3599,
        token_type: 'Bearer',
        scope: 'openid profile email',
      };

      const mockProfile = {
        id: '12345',
        email: 'unverified@example.com',
        verified_email: false,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/photo.jpg',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProfile,
        } as Response);

      await expect(handleGoogleCallback('test-code')).rejects.toThrow(
        'Google email is not verified'
      );
    });
  });
});
