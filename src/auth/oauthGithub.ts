import { config } from '../config';

/**
 * GitHub OAuth user profile from API
 */
interface GitHubUserProfile {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

/**
 * GitHub user email from API
 */
interface GitHubUserEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

/**
 * GitHub OAuth token response
 */
interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

/**
 * Generates the GitHub OAuth authorization URL
 *
 * @param state - CSRF protection state parameter
 * @returns Authorization URL to redirect user to
 */
export function getGitHubAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.github.clientId,
    redirect_uri: config.github.redirectUri,
    scope: config.github.scopes.join(' '),
    state: state,
    allow_signup: 'true',
  });

  return `${config.github.authUrl}?${params.toString()}`;
}

/**
 * Exchanges authorization code for access token
 *
 * @param code - Authorization code from GitHub callback
 * @returns Access token
 */
export async function exchangeGitHubCode(code: string): Promise<string> {
  const params = new URLSearchParams({
    code: code,
    client_id: config.github.clientId,
    client_secret: config.github.clientSecret,
    redirect_uri: config.github.redirectUri,
  });

  const response = await fetch(config.github.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange GitHub code: ${error}`);
  }

  const data = (await response.json()) as GitHubTokenResponse;
  return data.access_token;
}

/**
 * Fetches user profile from GitHub using access token
 *
 * @param accessToken - GitHub access token
 * @returns User profile data
 */
async function getGitHubUserInfo(accessToken: string): Promise<GitHubUserProfile> {
  const response = await fetch(config.github.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'User-Agent': 'OAuth-Login-API',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch GitHub user profile: ${error}`);
  }

  return (await response.json()) as GitHubUserProfile;
}

/**
 * Fetches user emails from GitHub using access token
 * GitHub API requires a separate endpoint for emails
 *
 * @param accessToken - GitHub access token
 * @returns Primary verified email
 */
async function getGitHubUserEmail(accessToken: string): Promise<string> {
  const response = await fetch(config.github.userEmailsUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'User-Agent': 'OAuth-Login-API',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch GitHub user emails: ${error}`);
  }

  const emails = (await response.json()) as GitHubUserEmail[];

  // Find primary verified email
  const primaryEmail = emails.find((email) => email.primary && email.verified);

  if (!primaryEmail) {
    throw new Error('No verified email found in GitHub account');
  }

  return primaryEmail.email;
}

/**
 * Fetches complete user profile from GitHub
 *
 * @param accessToken - GitHub access token
 * @returns User profile data with verified email
 */
export async function getGitHubUserProfile(accessToken: string): Promise<{
  providerId: string;
  email: string;
  name: string | null;
  avatarUrl: string;
}> {
  // Fetch user info and email in parallel
  const [userInfo, email] = await Promise.all([
    getGitHubUserInfo(accessToken),
    getGitHubUserEmail(accessToken),
  ]);

  return {
    providerId: userInfo.id.toString(),
    email: email,
    name: userInfo.name || userInfo.login,
    avatarUrl: userInfo.avatar_url,
  };
}

/**
 * Complete GitHub OAuth flow
 * Exchanges code for token and fetches user profile
 *
 * @param code - Authorization code from GitHub callback
 * @returns User profile data
 */
export async function handleGitHubCallback(code: string): Promise<{
  providerId: string;
  email: string;
  name: string | null;
  avatarUrl: string;
}> {
  // Exchange code for access token
  const accessToken = await exchangeGitHubCode(code);

  // Fetch user profile
  const userProfile = await getGitHubUserProfile(accessToken);

  return userProfile;
}
