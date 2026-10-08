import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canLoadPrivateData,
  isTemporaryNetworkFailure,
  requestHadBearerToken,
  sessionCheckFailure,
  shouldClearStoredSession,
  shouldInvalidateSession,
} from './sessionAuth.ts';

describe('session invalidation', () => {
  it('does not clear a session for login, signup, or Google credential failures', () => {
    assert.equal(shouldInvalidateSession(401, '/auth/login'), false);
    assert.equal(shouldInvalidateSession(401, '/api/auth/register'), false);
    assert.equal(shouldInvalidateSession(401, 'http://localhost:5000/api/auth/google'), false);
    assert.equal(shouldInvalidateSession(401, '/auth/forgot-password'), false);
    assert.equal(shouldInvalidateSession(401, '/auth/verify-otp?x=1'), false);
    assert.equal(shouldInvalidateSession(401, '/auth/reset-password'), false);
  });

  it('clears a session when a protected request or session check is rejected', () => {
    assert.equal(shouldInvalidateSession(401, '/auth/me'), true);
    assert.equal(shouldInvalidateSession(401, '/api/orders'), true);
    assert.equal(shouldInvalidateSession(401, '/auth/google/link'), true);
  });

  it('does not clear a session for authorization or server failures', () => {
    assert.equal(shouldInvalidateSession(403, '/api/orders'), false);
    assert.equal(shouldInvalidateSession(500, '/auth/me'), false);
    assert.equal(shouldInvalidateSession(undefined, '/auth/me'), false);
  });

  it('treats a missing response as temporary and a 401 as a definite rejection', () => {
    assert.equal(isTemporaryNetworkFailure({ code: 'ERR_NETWORK', message: 'Network Error' }), true);
    assert.equal(isTemporaryNetworkFailure({ isTimeout: true, message: 'timeout' }), true);
    assert.equal(isTemporaryNetworkFailure({ response: { status: 401 }, message: 'Invalid token' }), false);
  });

  it('does not clear a session when the failed request never sent a bearer token', () => {
    assert.equal(requestHadBearerToken(undefined), false);
    assert.equal(requestHadBearerToken({ Authorization: 'Bearer ' }), false);
    assert.equal(requestHadBearerToken({ authorization: 'Bearer session-token' }), true);
    assert.equal(requestHadBearerToken({ get: (name: string) => (name === 'Authorization' ? 'Bearer session-token' : undefined) }), true);
    assert.equal(shouldClearStoredSession(401, '/api/inventory/products', false), false);
    assert.equal(shouldClearStoredSession(401, '/api/notifications', false), false);
    assert.equal(shouldClearStoredSession(401, '/api/inventory/products', true), true);
    assert.equal(shouldClearStoredSession(401, '/api/auth/google', true), false);
    assert.equal(shouldClearStoredSession(500, '/api/inventory/products', true), false);
  });

  it('loads private data only after a confirmed session', () => {
    assert.equal(canLoadPrivateData({ isLoading: true, isAuthenticated: false }), false);
    assert.equal(canLoadPrivateData({ isLoading: true, isAuthenticated: true }), false);
    assert.equal(canLoadPrivateData({ isLoading: false, isAuthenticated: false }), false);
    assert.equal(canLoadPrivateData({ isLoading: false, isAuthenticated: true }), true);
  });

  it('keeps a stored session when startup validation cannot reach the server', () => {
    assert.equal(sessionCheckFailure({ code: 'ERR_NETWORK', message: 'Network Error' }), 'unreachable');
    assert.equal(sessionCheckFailure({ response: { status: 500 } }), 'unreachable');
    assert.equal(sessionCheckFailure({ response: { status: 403 } }), 'unreachable');
    assert.equal(sessionCheckFailure({ response: { status: 401 } }), 'invalid');
  });
});
