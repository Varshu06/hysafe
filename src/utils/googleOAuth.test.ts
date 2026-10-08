import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  androidGoogleRedirectUri,
  androidGoogleSignInRequest,
  canonicalWebRedirectUri,
  clearOAuthState,
  GOOGLE_OAUTH_STORAGE_KEY,
  readOAuthState,
  webGoogleRedirectUri,
  writeOAuthState,
  type OAuthStateStore,
} from './googleOAuth.ts';

const memoryStore = (): OAuthStateStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
};

describe('Android Google sign-in request', () => {
  it('uses the Web client as the ID token audience and sends no redirect', () => {
    const request = androidGoogleSignInRequest('90914010783-web.apps.googleusercontent.com');
    assert.deepEqual(request, {
      webClientId: '90914010783-web.apps.googleusercontent.com',
      offlineAccess: false,
      scopes: ['openid', 'email', 'profile'],
    });
    assert.equal(request && 'redirectUri' in request, false);
    assert.equal(request && 'clientSecret' in request, false);
    assert.equal(androidGoogleSignInRequest('com.hysafe.mobile'), null);
    assert.equal(androidGoogleSignInRequest(''), null);
  });

  it('does not use a custom-scheme redirect in the Android authorization request', () => {
    const reversed = androidGoogleRedirectUri('90914010783-android.apps.googleusercontent.com');
    assert.equal(reversed, 'com.googleusercontent.apps.90914010783-android:/oauth2redirect');
    const request = androidGoogleSignInRequest('90914010783-web.apps.googleusercontent.com');
    const serialized = JSON.stringify(request);
    assert.equal(serialized.includes('redirect'), false);
    assert.equal(serialized.includes('com.hysafe.mobile'), false);
    assert.equal(serialized.includes('com.googleusercontent.apps'), false);
    assert.equal(serialized.includes('oauthredirect'), false);
  });
});

describe('web Google redirect', () => {
  it('sends an origin-only redirect with the one trailing slash Google has registered', () => {
    assert.equal(canonicalWebRedirectUri('http://localhost:8081'), 'http://localhost:8081/');
    assert.equal(webGoogleRedirectUri('http://localhost:8081', 'http://127.0.0.1:8081'), 'http://localhost:8081/');
    assert.equal(webGoogleRedirectUri(' https://app.example.com ', 'http://localhost:8081'), 'https://app.example.com/');
    assert.equal(webGoogleRedirectUri('https://app.example.com/', 'http://localhost:8081'), 'https://app.example.com/');
  });

  it('keeps a callback path and the Android scheme unchanged', () => {
    assert.equal(
      webGoogleRedirectUri('https://app.example.com/oauth/callback', 'http://localhost:8081'),
      'https://app.example.com/oauth/callback',
    );
    assert.equal(canonicalWebRedirectUri('com.hysafe.mobile:/oauthredirect'), 'com.hysafe.mobile:/oauthredirect');
  });

  it('falls back to the current origin with one trailing slash', () => {
    assert.equal(webGoogleRedirectUri('', 'http://localhost:8081'), 'http://localhost:8081/');
    assert.equal(webGoogleRedirectUri('   ', 'https://app.example.com'), 'https://app.example.com/');
  });
});

describe('Google OAuth state storage', () => {
  it('keeps the verifier when session storage is empty but local storage still has it', () => {
    const local = memoryStore();
    const session = memoryStore();
    writeOAuthState([local, session], '{"state":"abc"}');
    session.removeItem(GOOGLE_OAUTH_STORAGE_KEY);

    assert.equal(readOAuthState([local, session]), '{"state":"abc"}');
    clearOAuthState([local, session]);
    assert.equal(readOAuthState([local, session]), null);
    assert.equal(local.data.size, 0);
  });
});
