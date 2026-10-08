import assert from 'node:assert/strict';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { describe, it } from 'node:test';
import {
  canConsumeVerifiedOtp,
  decideForgotPassword,
  DEV_OTP_SALT_FALLBACK,
  devOtpLogAllowed,
  evaluateOtpAttempt,
  FORGOT_PASSWORD_MESSAGE,
  hashOtp,
  OTP_UNAVAILABLE_MESSAGE,
  OtpAttemptState,
  resolveOtpSalt,
} from './otp.policy';
import { sessionRejection } from './session.policy';
import { verifyToken } from '../utils/jwt.util';

const salt = 'test-salt-value-16';
const code = '123456';
const now = new Date('2026-10-02T12:00:00.000Z');

const record = (overrides: Partial<OtpAttemptState> = {}): OtpAttemptState => ({
  attempts: 0,
  maxAttempts: 5,
  isUsed: false,
  isVerified: false,
  expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
  ...overrides,
});

describe('OTP configuration', () => {
  it('rejects a missing, short, or fallback salt outside development', () => {
    assert.deepEqual(resolveOtpSalt({ NODE_ENV: 'production' }), { ok: false });
    assert.deepEqual(resolveOtpSalt({ NODE_ENV: 'production', OTP_SALT: DEV_OTP_SALT_FALLBACK }), { ok: false });
    assert.deepEqual(resolveOtpSalt({ NODE_ENV: 'production', OTP_SALT: 'short' }), { ok: false });
    assert.deepEqual(resolveOtpSalt({ NODE_ENV: 'staging' }), { ok: false });
    assert.equal(devOtpLogAllowed({ NODE_ENV: 'production' }), false);
    assert.equal(devOtpLogAllowed({}), false);
  });

  it('allows the development fallback only when NODE_ENV is development', () => {
    const resolved = resolveOtpSalt({ NODE_ENV: 'development' });
    assert.equal(resolved.ok, true);
    if (resolved.ok) assert.equal(resolved.salt, DEV_OTP_SALT_FALLBACK);
    assert.equal(devOtpLogAllowed({ NODE_ENV: 'development' }), true);
    const configured = resolveOtpSalt({ NODE_ENV: 'production', OTP_SALT: salt });
    assert.equal(configured.ok && configured.salt, salt);
  });
});

describe('OTP verification decisions', () => {
  const stored = hashOtp(code, salt);

  it('rejects an expired code', () => {
    const expired = record({ expiresAt: new Date(now.getTime() - 1000) });
    assert.equal(evaluateOtpAttempt(expired, hashOtp(code, salt), stored, now), 'expired');
  });

  it('rejects an incorrect code and locks the final attempt', () => {
    assert.equal(evaluateOtpAttempt(record(), hashOtp('000000', salt), stored, now), 'invalid');
    assert.equal(
      evaluateOtpAttempt(record({ attempts: 4 }), hashOtp('000000', salt), stored, now),
      'locked',
    );
  });

  it('rejects a correct code after the attempt limit is already reached', () => {
    assert.equal(
      evaluateOtpAttempt(record({ attempts: 5 }), hashOtp(code, salt), stored, now),
      'locked',
    );
  });

  it('rejects a code that was already used', () => {
    assert.equal(
      evaluateOtpAttempt(record({ isUsed: true, isVerified: true }), hashOtp(code, salt), stored, now),
      'used',
    );
    assert.equal(canConsumeVerifiedOtp(record({ isUsed: true, isVerified: true }), now), false);
  });

  it('accepts a matching code and allows one consumption after verification', () => {
    assert.equal(evaluateOtpAttempt(record(), hashOtp(code, salt), stored, now), 'match');
    const verified = record({ isVerified: true });
    assert.equal(canConsumeVerifiedOtp(verified, now), true);
    assert.equal(canConsumeVerifiedOtp({ ...verified, isUsed: true }, now), false);
  });

  it('does not treat a different hash length as a match', () => {
    assert.equal(evaluateOtpAttempt(record(), 'short', stored, now), 'invalid');
  });
});

describe('forgot-password responses', () => {
  const base = {
    saltOk: true,
    providerReady: true,
    production: true,
    userExists: true,
    hasEmail: true,
    cooldown: false,
    delivered: true,
  };

  it('uses one message for an unknown account, a phone-only account, cooldown, and delivery failure', () => {
    for (const input of [
      { userExists: false },
      { hasEmail: false },
      { cooldown: true },
      { delivered: false },
    ]) {
      const decision = decideForgotPassword({ ...base, ...input });
      assert.equal(decision.status, 200);
      assert.equal(decision.message, FORGOT_PASSWORD_MESSAGE);
      assert.equal(decision.send, false);
    }
  });

  it('refuses to send when production secrets or the email provider are missing', () => {
    const missingSalt = decideForgotPassword({ ...base, saltOk: false });
    const missingProvider = decideForgotPassword({ ...base, providerReady: false });
    assert.equal(missingSalt.status, 503);
    assert.equal(missingSalt.message, OTP_UNAVAILABLE_MESSAGE);
    assert.equal(missingProvider.status, 503);
    assert.equal(missingProvider.send, false);
  });
});

describe('JWT and logout revocation', () => {
  const secret = crypto.randomBytes(32).toString('hex');

  it('rejects an expired token and a token signed with a different secret', () => {
    const previous = process.env.JWT_SECRET;
    process.env.JWT_SECRET = secret;
    try {
      const expired = jwt.sign({ userId: 'user-1', role: 'customer' }, secret, { expiresIn: -1 });
      const forged = jwt.sign({ userId: 'user-1', role: 'admin' }, `${secret}other`);
      assert.throws(() => verifyToken(expired));
      assert.throws(() => verifyToken(forged));
      assert.throws(() => verifyToken('not-a-token'));
    } finally {
      process.env.JWT_SECRET = previous;
    }
  });

  it('rejects an inactive account and a token issued before logout', () => {
    assert.equal(sessionRejection({ isActive: false }, { iat: 1_700_000_000 }), 'inactive');
    assert.equal(sessionRejection(null, { iat: 1_700_000_000 }), 'missing');

    const iat = 1_700_000_000;
    assert.equal(
      sessionRejection(
        { isActive: true, sessionValidAfter: new Date((iat + 5) * 1000) },
        { iat },
      ),
      'revoked',
    );
    assert.equal(
      sessionRejection(
        { isActive: true, sessionValidAfter: new Date(iat * 1000) },
        { iat: iat + 2 },
      ),
      null,
    );
    assert.equal(sessionRejection({ isActive: true }, { iat }), null);
  });
});
