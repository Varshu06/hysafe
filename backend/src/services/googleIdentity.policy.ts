export class GoogleAuthError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = 'GoogleAuthError';
    this.code = code;
    this.status = status;
  }
}

export const GOOGLE_MESSAGES = {
  invalid: 'Google sign-in could not be verified.',
  unverifiedEmail: 'Google did not provide a verified email for this account.',
  conflict:
    'An account with this email already exists. Sign in with your phone number and password, then link Google from Privacy & Security.',
  forbidden: 'This account must sign in with a phone number and password.',
  inactive: 'Account is inactive',
  notConfigured: 'Google sign-in is not configured.',
  redirect: 'This Google sign-in redirect is not allowed.',
  taken: 'This Google account is already linked to another user.',
  emailMismatch: 'The Google account email does not match the email on this HySafe account.',
  alreadyLinked: 'Google account is already linked.',
  linked: 'Google account linked.',
  success: 'Login successful',
};

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

export interface GoogleAccountSnapshot {
  googleId?: string | null;
  email?: string | null;
  role: string;
  isActive: boolean;
}

export type GoogleLoginDecision =
  | { type: 'sign-in' }
  | { type: 'create' }
  | { type: 'conflict' }
  | { type: 'forbidden-role' }
  | { type: 'inactive' }
  | { type: 'unverified-email' }
  | { type: 'invalid-identity' };

export type GoogleLinkDecision =
  | 'link'
  | 'already-linked'
  | 'unverified-email'
  | 'invalid-identity'
  | 'forbidden-role'
  | 'inactive'
  | 'email-mismatch'
  | 'taken';

export interface VerifiedTokenClaims {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  name?: string;
  picture?: string;
}

const GOOGLE_CLIENT_SUFFIX = '.apps.googleusercontent.com';

/** The only redirect an Android OAuth client accepts. The package scheme is not one of them. */
export function androidGoogleRedirectUri(androidClientId: string): string | null {
  const clientId = androidClientId.trim();
  if (!clientId.endsWith(GOOGLE_CLIENT_SUFFIX)) return null;
  const prefix = clientId.slice(0, -GOOGLE_CLIENT_SUFFIX.length);
  if (!prefix || /[^A-Za-z0-9.-]/.test(prefix)) return null;
  return `com.googleusercontent.apps.${prefix}:/oauth2redirect`;
}

export function googlePlaceholderPhone(sub: string): string {
  const cleaned = sub.replace(/[^a-zA-Z0-9]/g, '');
  if (!cleaned) {
    throw new GoogleAuthError('invalid_identity', 400, GOOGLE_MESSAGES.invalid);
  }
  return `g${cleaned}`;
}

export function safeGooglePicture(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const picture = value.trim();
  if (!picture.startsWith('https://') || picture.length > 500) return undefined;
  return picture;
}

export function safeGoogleName(value: unknown, email: string): string {
  if (typeof value === 'string') {
    const name = value.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (name) return name;
  }
  const local = email.split('@')[0]?.trim();
  return local ? local.slice(0, 80) : 'HySafe Customer';
}

export function assertVerifiedGoogleClaims(
  payload: VerifiedTokenClaims | undefined,
  audiences: string[],
  nowSeconds = Math.floor(Date.now() / 1000),
): GoogleIdentity {
  if (!payload?.sub || typeof payload.email !== 'string') {
    throw new GoogleAuthError('invalid_token', 400, GOOGLE_MESSAGES.invalid);
  }

  const email = payload.email.trim().toLowerCase();
  if (!email.includes('@')) {
    throw new GoogleAuthError('invalid_token', 400, GOOGLE_MESSAGES.invalid);
  }

  const issuer = payload.iss;
  if (issuer !== 'accounts.google.com' && issuer !== 'https://accounts.google.com') {
    throw new GoogleAuthError('invalid_token', 400, GOOGLE_MESSAGES.invalid);
  }

  if (typeof payload.exp !== 'number' || payload.exp <= nowSeconds) {
    throw new GoogleAuthError('invalid_token', 400, GOOGLE_MESSAGES.invalid);
  }

  const audience = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
  if (audiences.length === 0 || !audience.some((value) => audiences.includes(value))) {
    throw new GoogleAuthError('invalid_token', 400, GOOGLE_MESSAGES.invalid);
  }

  if (payload.email_verified !== true) {
    throw new GoogleAuthError('unverified_email', 400, GOOGLE_MESSAGES.unverifiedEmail);
  }

  return {
    sub: payload.sub,
    email,
    emailVerified: true,
    name: safeGoogleName(payload.name, email),
    picture: safeGooglePicture(payload.picture),
  };
}

export function decideGoogleLogin(
  identity: GoogleIdentity,
  linkedAccount: GoogleAccountSnapshot | null,
  emailAccount: GoogleAccountSnapshot | null,
): GoogleLoginDecision {
  if (!identity.sub || !identity.email) return { type: 'invalid-identity' };
  if (identity.emailVerified !== true) return { type: 'unverified-email' };

  const sameGoogleAccount =
    emailAccount && emailAccount.googleId && emailAccount.googleId === identity.sub
      ? emailAccount
      : null;
  const account = linkedAccount ?? sameGoogleAccount;

  if (account) {
    if (account.role !== 'customer') return { type: 'forbidden-role' };
    if (!account.isActive) return { type: 'inactive' };
    return { type: 'sign-in' };
  }

  if (emailAccount) return { type: 'conflict' };
  return { type: 'create' };
}

export function decideGoogleLink(
  identity: GoogleIdentity,
  current: GoogleAccountSnapshot,
  googleOwner: GoogleAccountSnapshot | null,
): GoogleLinkDecision {
  if (!identity.sub || !identity.email) return 'invalid-identity';
  if (identity.emailVerified !== true) return 'unverified-email';
  if (current.role !== 'customer') return 'forbidden-role';
  if (!current.isActive) return 'inactive';

  const currentEmail = current.email?.trim().toLowerCase();
  if (!currentEmail || currentEmail !== identity.email) return 'email-mismatch';
  if (current.googleId && current.googleId === identity.sub) return 'already-linked';
  if (current.googleId && current.googleId !== identity.sub) return 'taken';
  if (googleOwner?.googleId === identity.sub) return 'taken';
  return 'link';
}

/** Origin-only web redirects are stored by Google with one trailing slash. */
export function canonicalWebRedirectUri(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return value;
  if (url.username || url.password || url.search || url.hash) return value;
  if (url.pathname !== '/') return value;
  return `${url.origin}/`;
}

export function assertGoogleRedirectAllowed(
  redirectUri: string,
  allowed: string[],
  nodeEnv: string,
  androidClientId = '',
): void {
  const androidRedirect = androidGoogleRedirectUri(androidClientId);
  if (androidRedirect && redirectUri === androidRedirect) return;

  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    throw new GoogleAuthError('redirect', 400, GOOGLE_MESSAGES.redirect);
  }

  const requested = canonicalWebRedirectUri(redirectUri);
  const permitted = allowed.some((item) => canonicalWebRedirectUri(item) === requested);
  if (url.username || url.password || url.hash || requested !== redirectUri || !permitted) {
    throw new GoogleAuthError('redirect', 400, GOOGLE_MESSAGES.redirect);
  }

  const hostname = url.hostname.toLowerCase();
  const localhost = hostname === 'localhost' || hostname === '127.0.0.1';
  if (url.protocol === 'https:') return;
  if (url.protocol === 'http:' && localhost && nodeEnv !== 'production') return;
  throw new GoogleAuthError('redirect', 400, GOOGLE_MESSAGES.redirect);
}

export function classifyDuplicateKey(
  keyPattern: Record<string, unknown> | null | undefined,
): 'google' | 'email' | 'phone' | 'other' {
  const keys = Object.keys(keyPattern || {});
  if (keys.includes('googleId')) return 'google';
  if (keys.includes('email')) return 'email';
  if (keys.includes('phone')) return 'phone';
  return 'other';
}

export function isDuplicateKeyError(
  error: unknown,
): error is { code: number; keyPattern?: Record<string, unknown> } {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}
