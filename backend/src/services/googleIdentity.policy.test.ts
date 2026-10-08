import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { googleAuthSchema } from '../validators/auth.validation';
import {
  assertGoogleRedirectAllowed,
  assertVerifiedGoogleClaims,
  classifyDuplicateKey,
  decideGoogleLink,
  decideGoogleLogin,
  GoogleAccountSnapshot,
  GoogleAuthError,
  googlePlaceholderPhone,
  GOOGLE_MESSAGES,
} from './googleIdentity.policy';
import { exchangeGoogleAuthorizationCode, resolveGoogleCredential, validateGoogleConfiguration, verifyGoogleIdToken } from './googleToken.service';

const audience = 'web-client.apps.googleusercontent.com';
const future = Math.floor(Date.now() / 1000) + 3600;

const customer = (overrides: Partial<GoogleAccountSnapshot> = {}): GoogleAccountSnapshot => ({
  role: 'customer',
  isActive: true,
  email: 'person@example.com',
  googleId: null,
  ...overrides,
});

const identity = {
  sub: 'google-subject-1',
  email: 'person@example.com',
  emailVerified: true,
  name: 'Person',
};

const claims = {
  sub: 'google-subject-1',
  email: 'Person@Example.com',
  email_verified: true,
  iss: 'https://accounts.google.com',
  aud: audience,
  exp: future,
  name: 'Person',
  picture: 'https://example.com/photo.jpg',
};

describe('Google login policy', () => {
  it('creates a customer when the Google subject and email are new', () => {
    assert.deepEqual(decideGoogleLogin(identity, null, null), { type: 'create' });
  });

  it('signs in an existing customer linked by Google subject', () => {
    assert.deepEqual(
      decideGoogleLogin(identity, customer({ googleId: identity.sub }), null),
      { type: 'sign-in' },
    );
  });

  it('does not merge an existing account only because the email matches', () => {
    assert.deepEqual(decideGoogleLogin(identity, null, customer()), { type: 'conflict' });
  });

  it('rejects staff and admin accounts instead of granting their role', () => {
    assert.deepEqual(
      decideGoogleLogin(identity, customer({ role: 'staff', googleId: identity.sub }), null),
      { type: 'forbidden-role' },
    );
    assert.deepEqual(
      decideGoogleLogin(identity, customer({ role: 'admin', googleId: identity.sub }), null),
      { type: 'forbidden-role' },
    );
  });

  it('rejects an inactive linked customer', () => {
    assert.deepEqual(
      decideGoogleLogin(identity, customer({ googleId: identity.sub, isActive: false }), null),
      { type: 'inactive' },
    );
  });

  it('rejects an unverified email before creating or linking an account', () => {
    assert.deepEqual(
      decideGoogleLogin({ ...identity, emailVerified: false }, null, null),
      { type: 'unverified-email' },
    );
  });

  it('uses a non-mobile placeholder phone for a new Google customer', () => {
    const phone = googlePlaceholderPhone(identity.sub);
    assert.equal(phone, 'ggooglesubject1');
    assert.equal(/^\d{10}$/.test(phone), false);
  });

  it('classifies duplicate-key races by the unique field', () => {
    assert.equal(classifyDuplicateKey({ googleId: 1 }), 'google');
    assert.equal(classifyDuplicateKey({ email: 1 }), 'email');
    assert.equal(classifyDuplicateKey({ phone: 1 }), 'phone');
    assert.equal(classifyDuplicateKey({}), 'other');
  });
});

describe('Google link policy', () => {
  it('links only a signed-in customer whose email matches the verified Google email', () => {
    assert.equal(decideGoogleLink(identity, customer(), null), 'link');
  });

  it('is idempotent when the same Google subject is already linked', () => {
    assert.equal(
      decideGoogleLink(identity, customer({ googleId: identity.sub }), null),
      'already-linked',
    );
  });

  it('refuses a Google subject that belongs to someone else', () => {
    assert.equal(
      decideGoogleLink(identity, customer(), customer({ googleId: identity.sub })),
      'taken',
    );
  });

  it('does not let a customer attach staff or admin access', () => {
    assert.equal(decideGoogleLink(identity, customer({ role: 'staff' }), null), 'forbidden-role');
  });
});

describe('Google token claims', () => {
  it('accepts a verified payload for an allowed audience', () => {
    const verified = assertVerifiedGoogleClaims(claims, [audience], future - 10);
    assert.equal(verified.email, 'person@example.com');
    assert.equal(verified.emailVerified, true);
    assert.equal(verified.sub, identity.sub);
  });

  it('rejects an expired token', () => {
    assert.throws(
      () => assertVerifiedGoogleClaims({ ...claims, exp: future - 7200 }, [audience], future - 10),
      (error: unknown) => error instanceof GoogleAuthError && error.message === GOOGLE_MESSAGES.invalid,
    );
  });

  it('rejects a token for a different audience', () => {
    assert.throws(
      () => assertVerifiedGoogleClaims(claims, ['other-client.apps.googleusercontent.com'], future - 10),
      (error: unknown) => error instanceof GoogleAuthError,
    );
  });

  it('rejects an unverified email claim', () => {
    assert.throws(
      () => assertVerifiedGoogleClaims({ ...claims, email_verified: false }, [audience], future - 10),
      (error: unknown) => error instanceof GoogleAuthError && error.code === 'unverified_email',
    );
  });

  it('rejects a missing or malformed token before trusting it', async () => {
    await assert.rejects(
      () => verifyGoogleIdToken('', { GOOGLE_OAUTH_CLIENT_IDS: audience }),
      (error: unknown) => error instanceof GoogleAuthError,
    );
    await assert.rejects(
      () => verifyGoogleIdToken('not-a-jwt', { GOOGLE_OAUTH_CLIENT_IDS: audience }),
      (error: unknown) => error instanceof GoogleAuthError && error.status === 400,
    );
  });

  it('rejects an invalid signature reported by the verifier', async () => {
    await assert.rejects(
      () => verifyGoogleIdToken('header.payload.signature', { GOOGLE_OAUTH_CLIENT_IDS: audience }, async () => {
        throw new Error('invalid signature');
      }),
      (error: unknown) => error instanceof GoogleAuthError && error.message === GOOGLE_MESSAGES.invalid,
    );
  });

  it('does not call Google when no audience is configured', async () => {
    await assert.rejects(
      () => verifyGoogleIdToken('header.payload.signature', { GOOGLE_OAUTH_CLIENT_IDS: '' }, async () => claims),
      (error: unknown) => error instanceof GoogleAuthError && error.status === 503,
    );
  });
});

describe('Google redirect and request validation', () => {
  it('allows the reversed Android client redirect and an exact configured web origin', () => {
    assert.doesNotThrow(() => assertGoogleRedirectAllowed(
      'com.googleusercontent.apps.android-client:/oauth2redirect',
      [],
      'production',
      'android-client.apps.googleusercontent.com',
    ));
    assert.throws(() => assertGoogleRedirectAllowed('com.hysafe.mobile:/oauthredirect', [], 'production', 'android-client.apps.googleusercontent.com'));
    assert.doesNotThrow(() =>
      assertGoogleRedirectAllowed('http://localhost:8081/', ['http://localhost:8081'], 'development'),
    );
    assert.doesNotThrow(() =>
      assertGoogleRedirectAllowed('https://app.example.com/', ['https://app.example.com/'], 'production'),
    );
  });

  it('rejects unknown, insecure, and non-local redirects', () => {
    assert.throws(() => assertGoogleRedirectAllowed('http://localhost:8081', ['http://localhost:8081/'], 'development'));
    assert.throws(() => assertGoogleRedirectAllowed('https://evil.example/', ['https://app.example.com/'], 'production'));
    assert.throws(() => assertGoogleRedirectAllowed('http://localhost:8081/', ['http://localhost:8081/'], 'production'));
    assert.throws(() => assertGoogleRedirectAllowed('javascript:alert(1)', ['javascript:alert(1)'], 'development'));
  });

  it('rejects client role, email, and access-token fields', () => {
    const parsed = googleAuthSchema.safeParse({
      idToken: 'header.payload.signature-value',
      role: 'admin',
      email: 'attacker@example.com',
      accessToken: 'ya29.not-an-id-token',
    });
    assert.equal(parsed.success, false);
  });

  it('accepts an ID token without a code, and requires the full code payload', () => {
    assert.equal(googleAuthSchema.safeParse({ idToken: 'header.payload.signature-value' }).success, true);
    assert.equal(googleAuthSchema.safeParse({ code: 'auth-code' }).success, false);
    assert.equal(
      googleAuthSchema.safeParse({
        code: 'auth-code',
        codeVerifier: 'a'.repeat(43),
        redirectUri: 'https://app.example.com/',
      }).success,
      true,
    );
  });
});

describe('Google configuration', () => {
  it('accepts a complete configuration and rejects an incomplete production configuration', () => {
    const complete = {
      NODE_ENV: 'production',
      GOOGLE_OAUTH_CLIENT_IDS: 'web-client.apps.googleusercontent.com,android-client.apps.googleusercontent.com',
      GOOGLE_WEB_CLIENT_ID: 'web-client.apps.googleusercontent.com',
      GOOGLE_WEB_CLIENT_SECRET: 'test-web-client-secret',
      GOOGLE_ANDROID_CLIENT_ID: 'android-client.apps.googleusercontent.com',
      GOOGLE_OAUTH_REDIRECT_URIS: 'http://localhost:8081',
    };
    assert.doesNotThrow(() => validateGoogleConfiguration(complete));
    assert.throws(
      () => validateGoogleConfiguration({ NODE_ENV: 'production', GOOGLE_WEB_CLIENT_SECRET: 'test-web-client-secret' }),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes('GOOGLE_OAUTH_CLIENT_IDS') &&
        !error.message.includes('test-web-client-secret'),
    );
  });
});

describe('Android ID token', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('verifies the Web client audience and does not exchange a code or send a secret', async () => {
    let fetched = false;
    globalThis.fetch = async () => {
      fetched = true;
      return new Response('{}', { status: 500 });
    };

    const verified = await resolveGoogleCredential(
      { idToken: 'header.payload.signature' },
      { GOOGLE_OAUTH_CLIENT_IDS: audience, GOOGLE_WEB_CLIENT_SECRET: 'test-web-client-secret' },
      async (token, audiences) => {
        assert.equal(token, 'header.payload.signature');
        assert.deepEqual(audiences, [audience]);
        return claims;
      },
    );

    assert.equal(fetched, false);
    assert.equal(verified.sub, claims.sub);
    assert.equal(verified.emailVerified, true);
  });
});

describe('Google authorization code exchange', () => {
  const originalFetch = globalThis.fetch;
  const verifier = 'a'.repeat(43);
  const webRedirect = 'https://app.example.com/';

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends the Android client id for the reversed client redirect and omits the web secret', async () => {
    let body = '';
    globalThis.fetch = async (_url, init) => {
      body = String(init?.body || '');
      return new Response(JSON.stringify({ id_token: 'header.payload.signature' }), { status: 200 });
    };

    const token = await exchangeGoogleAuthorizationCode(
      { code: 'auth-code', codeVerifier: verifier, redirectUri: 'com.googleusercontent.apps.android-client:/oauth2redirect' },
      {
        NODE_ENV: 'production',
        GOOGLE_ANDROID_CLIENT_ID: 'android-client.apps.googleusercontent.com',
        GOOGLE_WEB_CLIENT_ID: 'web-client.apps.googleusercontent.com',
        GOOGLE_WEB_CLIENT_SECRET: 'test-web-client-secret',
      },
    );
    const sent = new URLSearchParams(body);

    assert.equal(token, 'header.payload.signature');
    assert.equal(sent.get('client_id'), 'android-client.apps.googleusercontent.com');
    assert.equal(sent.get('redirect_uri'), 'com.googleusercontent.apps.android-client:/oauth2redirect');
    assert.equal(sent.get('code_verifier'), verifier);
    assert.equal(sent.has('client_secret'), false);
  });

  it('sends the web client id and server secret for an allowed browser redirect', async () => {
    let body = '';
    globalThis.fetch = async (_url, init) => {
      body = String(init?.body || '');
      return new Response(JSON.stringify({ id_token: 'header.payload.signature' }), { status: 200 });
    };

    const token = await exchangeGoogleAuthorizationCode(
      { code: 'auth-code', codeVerifier: verifier, redirectUri: webRedirect },
      {
        NODE_ENV: 'production',
        GOOGLE_OAUTH_REDIRECT_URIS: webRedirect,
        GOOGLE_WEB_CLIENT_ID: 'web-client.apps.googleusercontent.com',
        GOOGLE_WEB_CLIENT_SECRET: 'test-web-client-secret',
        GOOGLE_ANDROID_CLIENT_ID: 'android-client.apps.googleusercontent.com',
      },
    );
    const sent = new URLSearchParams(body);

    assert.equal(token, 'header.payload.signature');
    assert.equal(sent.get('client_id'), 'web-client.apps.googleusercontent.com');
    assert.equal(sent.get('client_secret'), 'test-web-client-secret');
    assert.equal(sent.get('redirect_uri'), webRedirect);
  });

  it('does not call Google when the web secret or Android client id is missing', async () => {
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      return new Response('{}', { status: 200 });
    };

    await assert.rejects(
      () =>
        exchangeGoogleAuthorizationCode(
          { code: 'auth-code', codeVerifier: verifier, redirectUri: webRedirect },
          {
            NODE_ENV: 'production',
            GOOGLE_OAUTH_REDIRECT_URIS: webRedirect,
            GOOGLE_WEB_CLIENT_ID: 'web-client.apps.googleusercontent.com',
            GOOGLE_WEB_CLIENT_SECRET: '',
          },
        ),
      (error: unknown) => error instanceof GoogleAuthError && error.status === 503 && error.message === GOOGLE_MESSAGES.notConfigured,
    );
    await assert.rejects(
      () =>
        exchangeGoogleAuthorizationCode(
          { code: 'auth-code', codeVerifier: verifier, redirectUri: 'com.hysafe.mobile:/oauthredirect' },
          { NODE_ENV: 'production', GOOGLE_ANDROID_CLIENT_ID: 'android-client.apps.googleusercontent.com' },
        ),
      (error: unknown) => error instanceof GoogleAuthError && error.status === 400,
    );
    assert.equal(called, false);
  });

  it('does not call Google for a redirect outside the allow-list and hides provider errors', async () => {
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      return new Response(
        JSON.stringify({ error: 'invalid_grant', error_description: 'test-web-client-secret' }),
        { status: 400 },
      );
    };

    await assert.rejects(
      () =>
        exchangeGoogleAuthorizationCode(
          { code: 'auth-code', codeVerifier: verifier, redirectUri: 'https://evil.example/' },
          {
            NODE_ENV: 'production',
            GOOGLE_OAUTH_REDIRECT_URIS: webRedirect,
            GOOGLE_WEB_CLIENT_ID: 'web-client.apps.googleusercontent.com',
            GOOGLE_WEB_CLIENT_SECRET: 'test-web-client-secret',
          },
        ),
      (error: unknown) => error instanceof GoogleAuthError && error.message === GOOGLE_MESSAGES.redirect,
    );
    assert.equal(called, false);

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error_description: 'test-web-client-secret' }), { status: 400 });
    await assert.rejects(
      () =>
        exchangeGoogleAuthorizationCode(
          { code: 'auth-code', codeVerifier: verifier, redirectUri: webRedirect },
          {
            NODE_ENV: 'production',
            GOOGLE_OAUTH_REDIRECT_URIS: webRedirect,
            GOOGLE_WEB_CLIENT_ID: 'web-client.apps.googleusercontent.com',
            GOOGLE_WEB_CLIENT_SECRET: 'test-web-client-secret',
          },
        ),
      (error: unknown) =>
        error instanceof GoogleAuthError &&
        error.message === GOOGLE_MESSAGES.invalid &&
        !error.message.includes('test-web-client-secret'),
    );
  });
});
