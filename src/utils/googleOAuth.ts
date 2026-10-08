const GOOGLE_CLIENT_SUFFIX = '.apps.googleusercontent.com';

/**
 * Reversed-client redirect previously sent by the browser flow.
 * Google rejects every custom scheme on Android with 400 invalid_request, so the
 * Android app must not put this value in an authorization URL.
 */
export const androidGoogleRedirectUri = (androidClientId: string): string | null => {
  const clientId = androidClientId.trim();
  if (!clientId.endsWith(GOOGLE_CLIENT_SUFFIX)) return null;
  const prefix = clientId.slice(0, -GOOGLE_CLIENT_SUFFIX.length);
  if (!prefix || /[^A-Za-z0-9.-]/.test(prefix)) return null;
  return `com.googleusercontent.apps.${prefix}:/oauth2redirect`;
};

export type AndroidGoogleSignInRequest = {
  webClientId: string;
  offlineAccess: false;
  scopes: readonly ['openid', 'email', 'profile'];
};

/**
 * Native Android sign-in. The ID token audience is the Web client.
 * There is no redirect_uri: a custom scheme makes Google return 400 invalid_request.
 */
export const androidGoogleSignInRequest = (webClientId: string): AndroidGoogleSignInRequest | null => {
  const clientId = webClientId.trim();
  if (!clientId.endsWith(GOOGLE_CLIENT_SUFFIX)) return null;
  const prefix = clientId.slice(0, -GOOGLE_CLIENT_SUFFIX.length);
  if (!prefix || /[^A-Za-z0-9.-]/.test(prefix)) return null;
  return {
    webClientId: clientId,
    offlineAccess: false,
    scopes: ['openid', 'email', 'profile'],
  };
};

export const GOOGLE_OAUTH_STORAGE_KEY = 'hysafe_google_oauth';
export const GOOGLE_OAUTH_MAX_AGE_MS = 10 * 60 * 1000;

export type OAuthStateStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

/**
 * Google compares web redirect URIs exactly. An origin with no path and the same
 * origin with one trailing slash are different registrations. The local Web client
 * uses the form with the slash.
 */
export const canonicalWebRedirectUri = (value: string): string => {
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
};

/** Use the configured redirect, or the current origin, always in Google's canonical form. */
export const webGoogleRedirectUri = (configured: string, origin: string): string => {
  const explicit = configured.trim();
  const candidate = explicit || `${origin.replace(/\/$/, '')}/`;
  return canonicalWebRedirectUri(candidate);
};

export const writeOAuthState = (stores: OAuthStateStore[], value: string): void => {
  stores.forEach((store) => store.setItem(GOOGLE_OAUTH_STORAGE_KEY, value));
};

export const readOAuthState = (stores: OAuthStateStore[]): string | null => {
  for (const store of stores) {
    const value = store.getItem(GOOGLE_OAUTH_STORAGE_KEY);
    if (value) return value;
  }
  return null;
};

export const clearOAuthState = (stores: OAuthStateStore[]): void => {
  stores.forEach((store) => store.removeItem(GOOGLE_OAUTH_STORAGE_KEY));
};
