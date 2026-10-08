import { OAuth2Client } from 'google-auth-library';
import {
  androidGoogleRedirectUri,
  assertGoogleRedirectAllowed,
  assertVerifiedGoogleClaims,
  GoogleAuthError,
  GOOGLE_MESSAGES,
  GoogleIdentity,
  VerifiedTokenClaims,
} from './googleIdentity.policy';

export type GoogleCredentialBody = {
  idToken?: string;
  code?: string;
  codeVerifier?: string;
  redirectUri?: string;
};

export type IdTokenVerifier = (
  idToken: string,
  audiences: string[],
) => Promise<VerifiedTokenClaims | undefined>;

export function getAllowedGoogleAudiences(env: NodeJS.ProcessEnv = process.env): string[] {
  return (env.GOOGLE_OAUTH_CLIENT_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function googleConfigurationProblems(env: NodeJS.ProcessEnv = process.env): string[] {
  const problems: string[] = [];
  const audiences = getAllowedGoogleAudiences(env);
  const webClientId = env.GOOGLE_WEB_CLIENT_ID?.trim() || '';
  const androidClientId = env.GOOGLE_ANDROID_CLIENT_ID?.trim() || '';
  const redirects = getAllowedGoogleRedirects(env);

  if (audiences.length === 0) problems.push('GOOGLE_OAUTH_CLIENT_IDS');
  if (!webClientId) problems.push('GOOGLE_WEB_CLIENT_ID');
  if (!env.GOOGLE_WEB_CLIENT_SECRET?.trim()) problems.push('GOOGLE_WEB_CLIENT_SECRET');
  if (!androidClientId) problems.push('GOOGLE_ANDROID_CLIENT_ID');
  if (redirects.length === 0) problems.push('GOOGLE_OAUTH_REDIRECT_URIS');
  if (webClientId && audiences.length > 0 && !audiences.includes(webClientId)) {
    problems.push('GOOGLE_WEB_CLIENT_ID is not listed in GOOGLE_OAUTH_CLIENT_IDS');
  }
  if (androidClientId && audiences.length > 0 && !audiences.includes(androidClientId)) {
    problems.push('GOOGLE_ANDROID_CLIENT_ID is not listed in GOOGLE_OAUTH_CLIENT_IDS');
  }
  return problems;
}

/** Production refuses to start with a partial Google setup. Other environments keep the 503 response. */
export function validateGoogleConfiguration(env: NodeJS.ProcessEnv = process.env): void {
  const problems = googleConfigurationProblems(env);
  if (problems.length === 0) return;
  const message = `Google sign-in is not fully configured (${problems.join(', ')}).`;
  if (env.NODE_ENV === 'production') {
    throw new Error(message);
  }
  if (env.NODE_ENV !== 'test') {
    console.warn(message);
  }
}

export function getAllowedGoogleRedirects(env: NodeJS.ProcessEnv = process.env): string[] {
  return (env.GOOGLE_OAUTH_REDIRECT_URIS || '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

async function verifyWithGoogle(idToken: string, audiences: string[]): Promise<VerifiedTokenClaims | undefined> {
  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: audiences,
  });
  return ticket.getPayload();
}

export async function verifyGoogleIdToken(
  idToken: string,
  env: NodeJS.ProcessEnv = process.env,
  verify: IdTokenVerifier = verifyWithGoogle,
): Promise<GoogleIdentity> {
  const audiences = getAllowedGoogleAudiences(env);
  if (audiences.length === 0) {
    throw new GoogleAuthError('not_configured', 503, GOOGLE_MESSAGES.notConfigured);
  }
  if (!idToken || idToken.split('.').length !== 3) {
    throw new GoogleAuthError('invalid_token', 400, GOOGLE_MESSAGES.invalid);
  }

  let payload: VerifiedTokenClaims | undefined;
  try {
    payload = await verify(idToken, audiences);
  } catch {
    throw new GoogleAuthError('invalid_token', 400, GOOGLE_MESSAGES.invalid);
  }

  return assertVerifiedGoogleClaims(payload, audiences);
}

export async function exchangeGoogleAuthorizationCode(
  input: { code: string; codeVerifier: string; redirectUri: string },
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const androidClientId = env.GOOGLE_ANDROID_CLIENT_ID?.trim() || '';
  assertGoogleRedirectAllowed(
    input.redirectUri,
    getAllowedGoogleRedirects(env),
    env.NODE_ENV || 'development',
    androidClientId,
  );

  const native = input.redirectUri === androidGoogleRedirectUri(androidClientId);
  const clientId = (native ? androidClientId : env.GOOGLE_WEB_CLIENT_ID?.trim()) || '';
  const clientSecret = env.GOOGLE_WEB_CLIENT_SECRET?.trim();
  if (!clientId || (!native && !clientSecret)) {
    throw new GoogleAuthError('not_configured', 503, GOOGLE_MESSAGES.notConfigured);
  }

  const body = new URLSearchParams({
    code: input.code,
    client_id: clientId,
    redirect_uri: input.redirectUri,
    grant_type: 'authorization_code',
    code_verifier: input.codeVerifier,
  });
  if (!native && clientSecret) {
    body.set('client_secret', clientSecret);
  }

  let response: Response;
  try {
    response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new GoogleAuthError('exchange_failed', 400, GOOGLE_MESSAGES.invalid);
  }

  let idToken = '';
  try {
    const parsed = (await response.json()) as { id_token?: unknown };
    if (response.ok && typeof parsed.id_token === 'string') {
      idToken = parsed.id_token;
    }
  } catch {
    idToken = '';
  }

  if (!idToken) {
    throw new GoogleAuthError('exchange_failed', 400, GOOGLE_MESSAGES.invalid);
  }

  return idToken;
}

export async function resolveGoogleCredential(
  body: GoogleCredentialBody,
  env: NodeJS.ProcessEnv = process.env,
  verify?: IdTokenVerifier,
): Promise<GoogleIdentity> {
  const idToken = body.idToken
    ? body.idToken
    : await exchangeGoogleAuthorizationCode(
        {
          code: body.code || '',
          codeVerifier: body.codeVerifier || '',
          redirectUri: body.redirectUri || '',
        },
        env,
      );

  return verify ? verifyGoogleIdToken(idToken, env, verify) : verifyGoogleIdToken(idToken, env);
}
