import assert from 'assert';
import crypto from 'crypto';
import { verifyOtp, resetPassword } from './src/controllers/auth.controller';
import { Otp } from './src/models/Otp.model';
import { User } from './src/models/User.model';

process.env.OTP_SALT = 'password-reset-otp-test-salt';

const testOtp = '123456';
const wrongOtp = '654321';
const hashOtp = (otp: string) => crypto.createHash('sha256').update(otp + process.env.OTP_SALT).digest('hex');

let otpRecord: any;
let userSaveCount = 0;
let otpDeleteCount = 0;
const originals: Array<{ target: any; key: string; value: any }> = [];

const replace = (target: any, key: string, value: any) => {
  originals.push({ target, key, value: target[key] });
  target[key] = value;
};

const makeOtp = (overrides: Record<string, unknown> = {}) => ({
  _id: 'otp-test-id',
  identifier: 'customer@example.test',
  otpHash: hashOtp(testOtp),
  expiresAt: new Date(Date.now() + 60_000),
  attempts: 0,
  maxAttempts: 5,
  isUsed: false,
  isVerified: false,
  async save() {},
  ...overrides,
});

const makeResponse = () => {
  const response: { statusCode: number; body?: any } = { statusCode: 200 };
  return {
    response,
    res: {
      status(code: number) { response.statusCode = code; return this; },
      json(body: any) { response.body = body; return this; },
    },
  };
};

const verify = async (otp: string) => {
  const { response, res } = makeResponse();
  await verifyOtp({ body: { email: 'customer@example.test', otp } } as any, res as any);
  return response;
};

const reset = async (otp: string) => {
  const { response, res } = makeResponse();
  await resetPassword({ body: { email: 'customer@example.test', otp, newPassword: 'updated-password' } } as any, res as any);
  return response;
};

const main = async () => {
  const user: any = {
    _id: 'customer-test-id',
    email: 'customer@example.test',
    phone: '9000000000',
    password: 'old-password-hash',
    async save() { userSaveCount += 1; },
  };

  replace(User, 'findOne', async () => user);
  replace(Otp, 'findOne', async () => {
    if (!otpRecord || otpRecord.isUsed || otpRecord.expiresAt <= new Date()) return null;
    return otpRecord;
  });
  replace(Otp, 'findOneAndUpdate', async (query: any, update: any) => {
    if (!otpRecord || otpRecord.isUsed || otpRecord.expiresAt <= new Date()) return null;
    if (query.attempts?.$lt !== undefined && otpRecord.attempts >= query.attempts.$lt) return null;
    if (query.isVerified === true && !otpRecord.isVerified) return null;
    if (update.$inc?.attempts) otpRecord.attempts += update.$inc.attempts;
    if (update.$set?.isUsed === true) otpRecord.isUsed = true;
    return otpRecord;
  });
  replace(Otp, 'deleteMany', async () => { otpDeleteCount += 1; return { acknowledged: true }; });

  try {
    otpRecord = makeOtp();
    const verified = await verify(testOtp);
    assert.equal(verified.statusCode, 200, 'correct OTP verification succeeds');
    assert.equal(otpRecord.isVerified, true, 'successful verification uses existing verified state');

    otpRecord = makeOtp();
    const wrongVerification = await verify(wrongOtp);
    assert.equal(wrongVerification.statusCode, 400, 'incorrect OTP verification is rejected');
    assert.equal(otpRecord.attempts, 1, 'incorrect verification increments the existing attempt counter');

    otpRecord = makeOtp();
    for (let attempt = 1; attempt <= otpRecord.maxAttempts; attempt += 1) {
      const result = await verify(wrongOtp);
      assert.equal(result.statusCode, 400, `incorrect verification attempt ${attempt} is rejected`);
    }
    assert.equal(otpRecord.attempts, 5, 'attempt counter reaches the existing maximum');
    const exhaustedVerification = await verify(testOtp);
    assert.match(exhaustedVerification.body?.message || '', /Maximum verification attempts exceeded/);
    assert.equal(otpRecord.isVerified, false, 'exhausted OTP cannot be verified successfully');

    otpRecord = makeOtp();
    const wrongReset = await reset(wrongOtp);
    assert.equal(wrongReset.statusCode, 400, 'incorrect OTP submitted during reset is rejected');
    assert.equal(otpRecord.attempts, 1, 'incorrect reset submission increments the same attempt counter');
    for (let attempt = 2; attempt <= otpRecord.maxAttempts; attempt += 1) await reset(wrongOtp);
    assert.equal(otpRecord.attempts, 5, 'reset submissions enforce the existing maximum attempt count');
    const exhaustedReset = await reset(testOtp);
    assert.match(exhaustedReset.body?.message || '', /Maximum verification attempts exceeded/);
    assert.equal(userSaveCount, 0, 'exhausted OTP cannot reset the password');

    otpRecord = makeOtp({ isVerified: false });
    const directReset = await reset(testOtp);
    assert.equal(directReset.statusCode, 400, 'correct but unverified OTP cannot reset the password directly');
    assert.equal(userSaveCount, 0, 'unverified OTP leaves the password unchanged');
    assert.equal(otpRecord.isUsed, false, 'unverified OTP is not consumed');

    otpRecord = makeOtp({ isVerified: true });
    const successfulReset = await reset(testOtp);
    assert.equal(successfulReset.statusCode, 200, 'verified OTP preserves successful password reset behavior');
    assert.equal(otpRecord.isUsed, true, 'successful reset consumes the OTP');
    assert.equal(userSaveCount, 1, 'successful reset saves the new password');
    assert.equal(otpDeleteCount, 1, 'successful reset clears OTP records as before');

    otpRecord = makeOtp({ isVerified: true, expiresAt: new Date(Date.now() - 1) });
    const expiredReset = await reset(testOtp);
    assert.equal(expiredReset.statusCode, 400, 'expired OTP cannot reset the password');
    assert.equal(userSaveCount, 1, 'expired OTP leaves the password unchanged');

    console.log('Password-reset OTP tests passed.');
  } finally {
    for (const original of originals.reverse()) original.target[original.key] = original.value;
  }
};

main().catch((error) => {
  console.error('Password-reset OTP tests failed:', error);
  process.exitCode = 1;
});
