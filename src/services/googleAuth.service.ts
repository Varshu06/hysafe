import axios from 'axios';
import { Platform } from 'react-native';
import api from './api';
import { getProfile } from './auth.service';
import { storage } from '../utils/storage';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_WEB_REDIRECT_URI } from '../utils/constants';
import { sessionCheckFailure } from '../utils/sessionAuth';
import {
  clearOAuthState,
  GOOGLE_OAUTH_MAX_AGE_MS,
  OAuthStateStore,
  readOAuthState,
  webGoogleRedirectUri,
  writeOAuthState,
} from '../utils/googleOAuth';

export type GoogleCredential =
  | { idToken: string }
  | { code: string; codeVerifier: string; redirectUri: string };

export type GoogleCallbackOutcome =
  | { type: 'session'; user: any }
  | { type: 'linked' }
  | { type: 'message'; intent: 'login' | 'link'; message: string };

const browserOAuthStores = (): OAuthStateStore[] => {
  const stores: OAuthStateStore[] = [];
  if (typeof localStorage !== 'undefined') stores.push(localStorage);
  if (typeof sessionStorage !== 'undefined') stores.push(sessionStorage);
  return stores;
};

type StoredGoogleOAuth = {
  state: string;
  verifier: string;
  redirectUri: string;
  intent: 'login' | 'link';
  startedAt: number;
};

let googleRequestInFlight = false;
let webCallbackTask: Promise<GoogleCallbackOutcome | null> | null = null;

const base64Url = (bytes: Uint8Array): string => {
  let binary = '';
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const safeEqual = (left: string, right: string): boolean => {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
};

export const googleErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof message === 'string' && message.trim()) return message;
    if (!error.response) return 'Cannot connect to the server. Check your connection and try again.';
  }
  if (error instanceof Error && error.message.trim() && !error.message.startsWith('Request failed with status code')) {
    return error.message;
  }
  return fallback;
};

const withGoogleLock = async <T>(work: () => Promise<T>): Promise<T> => {
  if (googleRequestInFlight) {
    throw new Error('Google sign-in is already in progress.');
  }
  googleRequestInFlight = true;
  try {
    return await work();
  } finally {
    googleRequestInFlight = false;
  }
};

export const authenticateWithGoogle = async (credential: GoogleCredential) => {
  return withGoogleLock(async () => {
    const response = await api.post('/auth/google', credential);
    if (!response.data?.token) {
      throw new Error('Google sign-in could not be completed. Please try again.');
    }
    await storage.setToken(response.data.token);
    try {
      const profile = await getProfile();
      if (!profile?.user?.role) {
        await storage.clearAll();
        throw new Error('Google sign-in could not be completed. Please try again.');
      }
      await storage.setUser(profile.user);
      return { ...response.data, user: profile.user };
    } catch (error) {
      if (sessionCheckFailure(error) === 'invalid') {
        await storage.clearAll();
      }
      throw error;
    }
  });
};

export const linkGoogleAccount = async (credential: GoogleCredential) => {
  return withGoogleLock(async () => {
    const response = await api.post('/auth/google/link', credential);
    return response.data;
  });
};

export const beginWebGoogleOAuth = async (intent: 'login' | 'link'): Promise<void> => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    throw new Error('Google sign-in in the browser is not available on this device.');
  }
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error('Google sign-in is not configured.');
  }
  if (!window.crypto?.subtle || typeof localStorage === 'undefined') {
    throw new Error('This browser cannot start a secure Google sign-in.');
  }

  const verifier = base64Url(window.crypto.getRandomValues(new Uint8Array(32)));
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64Url(new Uint8Array(digest));
  const state = base64Url(window.crypto.getRandomValues(new Uint8Array(16)));
  const redirectUri = webGoogleRedirectUri(GOOGLE_WEB_REDIRECT_URI, window.location.origin);
  const stored: StoredGoogleOAuth = {
    state,
    verifier,
    redirectUri,
    intent,
    startedAt: Date.now(),
  };
  writeOAuthState(browserOAuthStores(), JSON.stringify(stored));

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', GOOGLE_WEB_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('prompt', 'select_account');
  window.location.assign(url.toString());
};

const clearOAuthParams = () => {
  const params = new URLSearchParams(window.location.search);
  ['code', 'state', 'error', 'error_description', 'scope', 'authuser', 'prompt', 'id_token', 'access_token'].forEach((key) => {
    params.delete(key);
  });
  const query = params.toString();
  const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history.replaceState({}, document.title, next);
};

const readWebCallback = ():
  | { type: 'credential'; intent: 'login' | 'link'; credential: GoogleCredential }
  | { type: 'message'; intent: 'login' | 'link'; message: string }
  | null => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const oauthError = params.get('error');
  if (!code && !state && !oauthError) return null;

  clearOAuthParams();
  const stores = browserOAuthStores();
  const raw = readOAuthState(stores);
  clearOAuthState(stores);

  let stored: StoredGoogleOAuth | null = null;
  if (raw) {
    try {
      stored = JSON.parse(raw) as StoredGoogleOAuth;
    } catch {
      stored = null;
    }
  }
  const intent = stored?.intent === 'link' ? 'link' : 'login';

  if (oauthError === 'access_denied') {
    return { type: 'message', intent, message: 'Google sign-in was cancelled.' };
  }
  if (oauthError || !stored || !code || !state) {
    return { type: 'message', intent, message: 'Google sign-in expired. Please try again.' };
  }
  if (!safeEqual(stored.state, state) || Date.now() - stored.startedAt > GOOGLE_OAUTH_MAX_AGE_MS) {
    return { type: 'message', intent, message: 'Google sign-in could not be verified. Please try again.' };
  }

  return {
    type: 'credential',
    intent,
    credential: {
      code,
      codeVerifier: stored.verifier,
      redirectUri: stored.redirectUri,
    },
  };
};

const runWebCallback = async (): Promise<GoogleCallbackOutcome | null> => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const pending = readWebCallback();
  if (!pending) return null;
  if (pending.type === 'message') return pending;

  try {
    if (pending.intent === 'link') {
      await linkGoogleAccount(pending.credential);
      return { type: 'linked' };
    }
    const session = await authenticateWithGoogle(pending.credential);
    return { type: 'session', user: session.user };
  } catch (error) {
    return {
      type: 'message',
      intent: pending.intent,
      message: googleErrorMessage(error, 'Google sign-in could not be completed. Please try again.'),
    };
  }
};

export const consumeGoogleWebCallback = (): Promise<GoogleCallbackOutcome | null> => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return Promise.resolve(null);
  if (!webCallbackTask) webCallbackTask = runWebCallback();
  return webCallbackTask;
};
