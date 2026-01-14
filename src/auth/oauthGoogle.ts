import { config } from '../config';

/**
 * Google OAuth user profile from API
 */
interface GoogleUserProfile {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

/**
 * Google OAuth token response
 */
interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
}

/**
 * Generates the Google OAuth authorization URL
 *
 * @param state - CSRF protection state parameter
 * @returns Authorization URL to redirect user to
 */
export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: 'code',
    scope: config.google.scopes.join(' '),
    state: state,
    access_type: 'online',
    prompt: 'select_account',
  });

  return `${config.google.authUrl}?${params.toString()}`;
}

/**
 * Exchanges authorization code for access token
 *
 * @param code - Authorization code from Google callback
 * @returns Access token response
 */
export async function exchangeGoogleCode(code: string): Promise<string> {
  const params = new URLSearchParams({
    code: code,
    client_id: config.google.clientId,
    client_secret: config.google.clientSecret,
    redirect_uri: config.google.redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(config.google.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange Google code: ${error}`);
  }

  const data = (await response.json()) as GoogleTokenResponse;
  return data.access_token;
}

/**
 * Fetches user profile from Google using access token
 *
 * @param accessToken - Google access token
 * @returns User profile data
 */
export async function getGoogleUserProfile(accessToken: string): Promise<{
  providerId: string;
  email: string;
  name: string;
  avatarUrl: string;
}> {
  const response = await fetch(config.google.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Google user profile: ${error}`);
  }

  const profile = (await response.json()) as GoogleUserProfile;

  // Ensure email is verified
  if (!profile.verified_email) {
    throw new Error('Google email is not verified');
  }

  return {
    providerId: profile.id,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.picture,
  };
}

/**
 * Complete Google OAuth flow
 * Exchanges code for token and fetches user profile
 *
 * @param code - Authorization code from Google callback
 * @returns User profile data
 */
export async function handleGoogleCallback(code: string): Promise<{
  providerId: string;
  email: string;
  name: string;
  avatarUrl: string;
}> {
  // Exchange code for access token
  const accessToken = await exchangeGoogleCode(code);

  // Fetch user profile
  const userProfile = await getGoogleUserProfile(accessToken);

  return userProfile;
}
