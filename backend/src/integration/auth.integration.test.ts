import assert from 'node:assert/strict';
import http from 'http';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { after, before, describe, it } from 'node:test';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { CustomerProfile } from '../models/CustomerProfile.model';
import { Otp } from '../models/Otp.model';
import { Staff } from '../models/Staff.model';
import { User } from '../models/User.model';
import { DUPLICATE_ACCOUNT_MESSAGE, REGISTRATION_FAILED_MESSAGE } from '../services/registration.service';
import { FORGOT_PASSWORD_MESSAGE, OTP_INVALID_MESSAGE, OTP_LOCKED_MESSAGE, OTP_REUSED_MESSAGE, OTP_UNAVAILABLE_MESSAGE, hashOtp } from '../services/otp.policy';
import { GOOGLE_MESSAGES } from '../services/googleIdentity.policy';
import { hashPassword } from '../utils/bcrypt.util';

const SECRET = process.env.JWT_SECRET || '';
const OTP_SALT = process.env.OTP_SALT || '';
const PASSWORD = 'TestPass1';

let replSet: MongoMemoryReplSet;
let server: http.Server;
let port = 0;
let phoneSeq = 8100000000;

const nextPhone = () => String(++phoneSeq);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ApiResult = { status: number; body: Record<string, any> };

const api = async (
  method: string,
  path: string,
  options: { token?: string; body?: unknown; ip?: string } = {},
): Promise<ApiResult> => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': options.ip || `203.0.113.${phoneSeq % 200 + 1}`,
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let body: Record<string, any> = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }
  return { status: response.status, body };
};

const provision = async (role: 'customer' | 'staff' | 'admin', email: string) => {
  const phone = nextPhone();
  const user = await User.create({
    email,
    phone,
    password: await hashPassword(PASSWORD),
    role,
    name: role,
    isActive: true,
  });
  if (role === 'customer') {
    await CustomerProfile.create({
      userId: user._id,
      name: role,
      address: 'Test address',
      customerType: 'home',
    });
  }
  if (role === 'staff') {
    await Staff.create({
      userId: user._id,
      name: role,
      phone,
      isOnline: false,
    });
  }
  return user;
};

describe('authentication API', { concurrency: 1 }, () => {
  before(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());
    await User.syncIndexes();
    await CustomerProfile.syncIndexes();
    await Otp.syncIndexes();
    const { default: app } = await import('../app');
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not bind a port');
    port = address.port;
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  it('logs in customer, staff, and admin and accepts the token on /me', async () => {
    const customer = await provision('customer', 'customer.login@example.test');
    const staff = await provision('staff', 'staff.login@example.test');
    const admin = await provision('admin', 'admin.login@example.test');
    const ip = '203.0.113.10';

    const customerLogin = await api('POST', '/api/auth/login', {
      ip,
      body: { phone: customer.phone, password: PASSWORD },
    });
    const staffLogin = await api('POST', '/api/auth/login', {
      ip,
      body: { phone: staff.phone, password: PASSWORD },
    });
    const adminLogin = await api('POST', '/api/auth/login', {
      ip,
      body: { phone: admin.phone, password: PASSWORD },
    });

    assert.equal(customerLogin.status, 200);
    assert.equal(customerLogin.body.user.role, 'customer');
    assert.equal(staffLogin.body.user.role, 'staff');
    assert.equal(adminLogin.body.user.role, 'admin');
    assert.equal('password' in customerLogin.body.user, false);

    const me = await api('GET', '/api/auth/me', { ip, token: customerLogin.body.token });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.phone, customer.phone);
    assert.equal(me.body.user.password, undefined);
  });

  it('rejects an unknown account and a wrong password without revoking an existing session', async () => {
    const user = await provision('customer', 'wrong.password@example.test');
    const ip = '203.0.113.11';
    const login = await api('POST', '/api/auth/login', {
      ip,
      body: { phone: user.phone, password: PASSWORD },
    });
    const wrong = await api('POST', '/api/auth/login', {
      ip,
      body: { phone: user.phone, password: 'not-the-password' },
    });
    const unknown = await api('POST', '/api/auth/login', {
      ip,
      body: { phone: '8199999999', password: PASSWORD },
    });
    const me = await api('GET', '/api/auth/me', { ip, token: login.body.token });

    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.message, unknown.body.message);
    assert.equal(me.status, 200);
  });

  it('rejects an expired token, a forged signature, and an inactive account', async () => {
    const user = await provision('customer', 'inactive.user@example.test');
    const ip = '203.0.113.12';
    const login = await api('POST', '/api/auth/login', {
      ip,
      body: { phone: user.phone, password: PASSWORD },
    });
    await sleep(1100);
    user.isActive = false;
    await user.save();

    const expired = jwt.sign(
      { userId: String(user._id), role: 'customer', exp: Math.floor(Date.now() / 1000) - 10 },
      SECRET,
    );
    const forged = jwt.sign({ userId: String(user._id), role: 'admin' }, `${SECRET}-other`);
    const expiredResult = await api('GET', '/api/auth/me', { ip, token: expired });
    const forgedResult = await api('GET', '/api/auth/me', { ip, token: forged });
    const inactive = await api('GET', '/api/auth/me', { ip, token: login.body.token });

    assert.equal(expiredResult.status, 401);
    assert.equal(forgedResult.status, 401);
    assert.equal(inactive.status, 401);
    assert.equal(inactive.body.message, 'User not found or inactive');
  });

  it('invalidates the current token on logout and after a password change', async () => {
    const logoutUser = await provision('customer', 'logout.user@example.test');
    const changeUser = await provision('customer', 'change.user@example.test');
    const ip = '203.0.113.13';
    const first = await api('POST', '/api/auth/login', {
      ip,
      body: { phone: logoutUser.phone, password: PASSWORD },
    });
    await sleep(1100);
    const logout = await api('POST', '/api/auth/logout', { ip, token: first.body.token });
    const afterLogout = await api('GET', '/api/auth/me', { ip, token: first.body.token });

    const second = await api('POST', '/api/auth/login', {
      ip,
      body: { phone: changeUser.phone, password: PASSWORD },
    });
    await sleep(1100);
    const changed = await api('PUT', '/api/auth/change-password', {
      ip,
      token: second.body.token,
      body: { currentPassword: PASSWORD, newPassword: 'ChangedPass1' },
    });
    const oldSession = await api('GET', '/api/auth/me', { ip, token: second.body.token });
    const fresh = await api('POST', '/api/auth/login', {
      ip,
      body: { phone: changeUser.phone, password: 'ChangedPass1' },
    });

    assert.equal(logout.status, 200);
    assert.equal(afterLogout.status, 401);
    assert.equal(changed.status, 200);
    assert.equal(oldSession.status, 401);
    assert.equal(fresh.status, 200);
    assert.equal(fresh.body.user.role, 'customer');
  });

  it('registers a customer, normalizes +91, and ignores a privileged role', async () => {
    const ip = '203.0.113.20';
    const phone = nextPhone();
    const created = await api('POST', '/api/auth/register', {
      ip,
      body: {
        name: 'New Customer',
        email: 'new.customer@example.test',
        phone: `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`,
        password: PASSWORD,
        role: 'admin',
        address: 'Valliyur',
        customerType: 'home',
      },
    });
    const stored = await User.findOne({ phone });
    const profile = stored ? await CustomerProfile.findOne({ userId: stored._id }) : null;

    assert.equal(created.status, 201);
    assert.equal(created.body.user.role, 'customer');
    assert.equal(created.body.user.phone, phone);
    assert.equal('password' in created.body.user, false);
    assert.equal(stored?.role, 'customer');
    assert.ok(profile);
  });

  it('rejects an invalid phone and duplicate phone or email', async () => {
    const ip = '203.0.113.21';
    const phone = nextPhone();
    const email = 'duplicate.person@example.test';
    const first = await api('POST', '/api/auth/register', {
      ip,
      body: { name: 'First', email, phone, password: PASSWORD },
    });
    const invalid = await api('POST', '/api/auth/register', {
      ip,
      body: { name: 'Bad', email: 'bad.phone@example.test', phone: '12345', password: PASSWORD },
    });
    const duplicatePhone = await api('POST', '/api/auth/register', {
      ip,
      body: { name: 'Second', email: 'other.person@example.test', phone, password: PASSWORD },
    });
    const duplicateEmail = await api('POST', '/api/auth/register', {
      ip,
      body: { name: 'Third', email: email.toUpperCase(), phone: nextPhone(), password: PASSWORD },
    });

    assert.equal(first.status, 201);
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.errors?.[0]?.message, 'Phone number must be 10 digits');
    assert.equal(duplicatePhone.status, 400);
    assert.equal(duplicatePhone.body.message, DUPLICATE_ACCOUNT_MESSAGE);
    assert.equal(duplicateEmail.status, 400);
    assert.equal(duplicateEmail.body.message, DUPLICATE_ACCOUNT_MESSAGE);
  });

  it('does not keep a customer when profile creation fails', async () => {
    const ip = '203.0.113.22';
    const phone = nextPhone();
    const originalSave = CustomerProfile.prototype.save;
    CustomerProfile.prototype.save = function rejectIncomplete(...args: unknown[]) {
      if (this.get('name') === 'Rollback Person') {
        return Promise.reject(new Error('profile write failed'));
      }
      return originalSave.apply(this, args as []);
    };
    try {
      const created = await api('POST', '/api/auth/register', {
        ip,
        body: {
          name: 'Rollback Person',
          email: 'rollback.person@example.test',
          phone,
          password: PASSWORD,
        },
      });
      const stored = await User.findOne({ phone });
      const profiles = await CustomerProfile.find({ name: 'Rollback Person' });

      assert.equal(created.status, 500);
      assert.equal(created.body.message, REGISTRATION_FAILED_MESSAGE);
      assert.equal(JSON.stringify(created.body).includes('profile write failed'), false);
      assert.equal(stored, null);
      assert.equal(profiles.length, 0);
    } finally {
      CustomerProfile.prototype.save = originalSave;
    }
  });

  it('handles concurrent registration of the same phone', async () => {
    const ip = '203.0.113.23';
    const phone = nextPhone();
    const body = {
      name: 'Race Customer',
      email: 'race.customer@example.test',
      phone,
      password: PASSWORD,
    };
    const [first, second] = await Promise.all([
      api('POST', '/api/auth/register', { ip, body }),
      api('POST', '/api/auth/register', { ip: '203.0.113.24', body: { ...body, email: 'race.other@example.test' } }),
    ]);
    const statuses = [first.status, second.status].sort();
    const users = await User.find({ phone });

    assert.deepEqual(statuses, [201, 400]);
    assert.equal(users.length, 1);
    assert.equal(
      [first, second].find((result) => result.status === 400)?.body.message,
      DUPLICATE_ACCOUNT_MESSAGE,
    );
  });

  it('resets a password with a real OTP and rejects expiry, reuse, and too many guesses', async () => {
    const user = await provision('customer', 'otp.user@example.test');
    const ip = '203.0.113.30';
    const previousEnv = process.env.NODE_ENV;
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map((value) => String(value)).join(' '));
    };
    process.env.NODE_ENV = 'development';
    let requested: ApiResult;
    try {
      requested = await api('POST', '/api/auth/forgot-password', {
        ip,
        body: { email: user.email },
      });
    } finally {
      console.log = originalLog;
      process.env.NODE_ENV = previousEnv;
    }

    const otpLine = logs.find((line) => line.includes('OTP CODE:')) || '';
    const otp = otpLine.split('OTP CODE:')[1]?.trim();
    assert.equal(requested!.status, 200);
    assert.equal(requested!.body.message, FORGOT_PASSWORD_MESSAGE);
    assert.equal(JSON.stringify(requested!.body).includes(otp || 'missing-otp'), false);
    assert.match(otp || '', /^\d{6}$/);

    const login = await api('POST', '/api/auth/login', {
      ip,
      body: { phone: user.phone, password: PASSWORD },
    });
    await sleep(1100);
    const reset = await api('POST', '/api/auth/reset-password', {
      ip,
      body: { email: user.email, otp, newPassword: 'ResetPass1' },
    });
    const oldSession = await api('GET', '/api/auth/me', { ip, token: login.body.token });
    const reused = await api('POST', '/api/auth/reset-password', {
      ip,
      body: { email: user.email, otp, newPassword: 'ResetPass2' },
    });
    const fresh = await api('POST', '/api/auth/login', {
      ip,
      body: { phone: user.phone, password: 'ResetPass1' },
    });

    const reusedPassword = await api('POST', '/api/auth/login', {
      ip,
      body: { phone: user.phone, password: 'ResetPass2' },
    });

    assert.equal(reset.status, 200);
    assert.equal(JSON.stringify(reset.body).includes(otp || ''), false);
    assert.equal(oldSession.status, 401);
    assert.equal(reused.status, 400);
    assert.equal(reused.body.message, OTP_INVALID_MESSAGE);
    assert.equal(fresh.status, 200);
    assert.equal(reusedPassword.status, 401);

    const consumedUser = await provision('customer', 'consumed.otp@example.test');
    await Otp.create({
      identifier: consumedUser.email,
      otpHash: hashOtp('333333', OTP_SALT),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      maxAttempts: 5,
      isUsed: true,
      isVerified: true,
    });
    const consumed = await api('POST', '/api/auth/reset-password', {
      ip: '203.0.113.33',
      body: { email: consumedUser.email, otp: '333333', newPassword: 'ResetPass9' },
    });
    assert.equal(consumed.status, 400);
    assert.equal(consumed.body.message, OTP_REUSED_MESSAGE);

    const expiredUser = await provision('customer', 'expired.otp@example.test');
    await Otp.create({
      identifier: expiredUser.email,
      otpHash: hashOtp('111111', OTP_SALT),
      expiresAt: new Date(Date.now() - 1000),
      attempts: 0,
      maxAttempts: 5,
      isUsed: false,
      isVerified: false,
    });
    const expired = await api('POST', '/api/auth/reset-password', {
      ip: '203.0.113.31',
      body: { email: expiredUser.email, otp: '111111', newPassword: 'ResetPass1' },
    });
    assert.equal(expired.status, 400);

    const lockedUser = await provision('customer', 'locked.otp@example.test');
    await Otp.create({
      identifier: lockedUser.email,
      otpHash: hashOtp('222222', OTP_SALT),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      maxAttempts: 5,
      isUsed: false,
      isVerified: false,
    });
    const guesses = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      guesses.push(await api('POST', '/api/auth/verify-otp', {
        ip: '203.0.113.32',
        body: { email: lockedUser.email, otp: '000000' },
      }));
    }
    assert.equal(guesses[4].status, 400);
    assert.equal(guesses[4].body.message, OTP_LOCKED_MESSAGE);
  });

  it('keeps forgot-password responses generic and refuses a missing production salt', async () => {
    const ip = '203.0.113.40';
    const unknown = await api('POST', '/api/auth/forgot-password', {
      ip,
      body: { email: 'nobody@example.test' },
    });
    const phoneOnly = await User.create({
      phone: nextPhone(),
      password: await hashPassword(PASSWORD),
      role: 'customer',
      name: 'Phone Only',
      isActive: true,
    });
    const phoneOnlyResult = await api('POST', '/api/auth/forgot-password', {
      ip,
      body: { phone: phoneOnly.phone },
    });
    const storedCodes = await Otp.find({
      identifier: { $in: ['nobody@example.test', phoneOnly.phone] },
    });

    assert.equal(unknown.status, 200);
    assert.equal(phoneOnlyResult.status, 200);
    assert.equal(unknown.body.message, phoneOnlyResult.body.message);
    assert.equal(storedCodes.length, 0);

    const previousSalt = process.env.OTP_SALT;
    const previousEnv = process.env.NODE_ENV;
    let missingSalt: ApiResult;
    let missingProvider: ApiResult;
    try {
      process.env.OTP_SALT = '';
      process.env.NODE_ENV = 'test';
      missingSalt = await api('POST', '/api/auth/forgot-password', {
        ip: '203.0.113.41',
        body: { email: 'admin.login@example.test' },
      });
      process.env.OTP_SALT = previousSalt;
      process.env.NODE_ENV = 'production';
      missingProvider = await api('POST', '/api/auth/forgot-password', {
        ip: '203.0.113.42',
        body: { email: 'nobody-else@example.test' },
      });
    } finally {
      process.env.OTP_SALT = previousSalt;
      process.env.NODE_ENV = previousEnv;
    }

    assert.equal(missingSalt.status, 503);
    assert.equal(missingSalt.body.message, OTP_UNAVAILABLE_MESSAGE);
    assert.equal(missingProvider.status, 503);
    assert.equal(JSON.stringify(missingProvider.body).includes('OTP CODE'), false);
  });

  it('enforces the one-minute resend cooldown without a different public response', async () => {
    const user = await provision('customer', 'cooldown.user@example.test');
    const ip = '203.0.113.43';
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const originalLog = console.log;
    console.log = () => undefined;
    let first: ApiResult;
    let second: ApiResult;
    try {
      first = await api('POST', '/api/auth/forgot-password', { ip, body: { email: user.email } });
      second = await api('POST', '/api/auth/forgot-password', { ip: '203.0.113.44', body: { email: user.email } });
    } finally {
      console.log = originalLog;
      process.env.NODE_ENV = previousEnv;
    }
    const codes = await Otp.find({ identifier: user.email });

    assert.equal(first!.status, 200);
    assert.equal(second!.status, 200);
    assert.equal(first!.body.message, second!.body.message);
    assert.equal(codes.length, 1);
  });

  it('keeps admin routes limited to admins and requires a session to link Google', async () => {
    const customer = await provision('customer', 'acl.customer@example.test');
    const staff = await provision('staff', 'acl.staff@example.test');
    const admin = await provision('admin', 'acl.admin@example.test');
    const ip = '203.0.113.50';
    const customerLogin = await api('POST', '/api/auth/login', {
      ip,
      body: { phone: customer.phone, password: PASSWORD },
    });
    const staffLogin = await api('POST', '/api/auth/login', {
      ip,
      body: { phone: staff.phone, password: PASSWORD },
    });
    const adminLogin = await api('POST', '/api/auth/login', {
      ip,
      body: { phone: admin.phone, password: PASSWORD },
    });

    const customerAdmin = await api('GET', '/api/customers', { ip, token: customerLogin.body.token });
    const staffAdmin = await api('GET', '/api/customers', { ip, token: staffLogin.body.token });
    const adminCustomers = await api('GET', '/api/customers', { ip, token: adminLogin.body.token });
    const link = await api('POST', '/api/auth/google/link', {
      ip,
      body: { idToken: 'header.payload.signature-token' },
    });
    const google = await api('POST', '/api/auth/google', {
      ip,
      body: { idToken: 'header.payload.signature-token' },
    });

    assert.equal(customerAdmin.status, 403);
    assert.equal(staffAdmin.status, 403);
    assert.equal(adminCustomers.status, 200);
    assert.equal(link.status, 401);
    assert.equal(google.status, 503);
    assert.equal(google.body.message, GOOGLE_MESSAGES.notConfigured);
  });

  it('creates a new Google customer, signs that customer in again, and rejects unsafe identities', async () => {
    const restoreEnv = useGoogleTestEnv();
    const restoreVerifier = stubGoogleTicket(googleClaims({
      sub: 'new-google-subject',
      email: 'new.google.customer@example.test',
      name: 'New Google',
    }));
    try {
      const created = await api('POST', '/api/auth/google', {
        ip: '198.51.100.10',
        body: { idToken: 'header.payload.signature' },
      });
      const stored = await User.findOne({ googleId: 'new-google-subject' });
      const profile = stored ? await CustomerProfile.findOne({ userId: stored._id }) : null;
      const me = await api('GET', '/api/auth/me', { ip: '198.51.100.10', token: created.body.token });
      await sleep(1100);
      const logout = await api('POST', '/api/auth/logout', { ip: '198.51.100.10', token: created.body.token });
      const afterLogout = await api('GET', '/api/auth/me', { ip: '198.51.100.10', token: created.body.token });

      assert.equal(created.status, 200);
      assert.equal(created.body.user.role, 'customer');
      assert.equal('password' in created.body.user, false);
      assert.equal(stored?.role, 'customer');
      assert.ok(profile);
      assert.equal(me.status, 200);
      assert.equal(me.body.user.email, 'new.google.customer@example.test');
      assert.equal(logout.status, 200);
      assert.equal(afterLogout.status, 401);

      const again = await api('POST', '/api/auth/google', {
        ip: '198.51.100.11',
        body: { idToken: 'header.payload.signature' },
      });
      const users = await User.find({ googleId: 'new-google-subject' });
      assert.equal(again.status, 200);
      assert.equal(again.body.user.role, 'customer');
      assert.equal(users.length, 1);

      restoreVerifier();
      const unverified = stubGoogleTicket(googleClaims({
        sub: 'unverified-google-subject',
        email: 'unverified.google@example.test',
        email_verified: false,
      }));
      const unverifiedResult = await api('POST', '/api/auth/google', {
        ip: '198.51.100.12',
        body: { idToken: 'header.payload.signature' },
      });
      unverified();
      assert.equal(unverifiedResult.status, 400);
      assert.equal(unverifiedResult.body.message, GOOGLE_MESSAGES.unverifiedEmail);

      const expired = stubGoogleTicket(googleClaims({
        sub: 'expired-google-subject',
        email: 'expired.google@example.test',
        exp: Math.floor(Date.now() / 1000) - 10,
      }));
      const expiredResult = await api('POST', '/api/auth/google', {
        ip: '198.51.100.13',
        body: { idToken: 'header.payload.signature' },
      });
      expired();
      assert.equal(expiredResult.status, 400);

      const audience = stubGoogleTicket(googleClaims({
        sub: 'audience-google-subject',
        email: 'audience.google@example.test',
        aud: 'other-client.apps.googleusercontent.com',
      }));
      const audienceResult = await api('POST', '/api/auth/google', {
        ip: '198.51.100.14',
        body: { idToken: 'header.payload.signature' },
      });
      audience();
      assert.equal(audienceResult.status, 400);

      const invalid = stubGoogleTicket(new Error('invalid signature'));
      const invalidResult = await api('POST', '/api/auth/google', {
        ip: '198.51.100.15',
        body: { idToken: 'header.payload.signature' },
      });
      invalid();
      assert.equal(invalidResult.status, 400);
      assert.equal(invalidResult.body.message, GOOGLE_MESSAGES.invalid);
      assert.equal(JSON.stringify(invalidResult.body).includes('invalid signature'), false);
    } finally {
      restoreVerifier();
      restoreEnv();
    }
  });

  it('does not merge a password account by email, refuses staff, and rolls back a failed profile', async () => {
    const restoreEnv = useGoogleTestEnv();
    const passwordUser = await provision('customer', 'password.google.conflict@example.test');
    const staff = await provision('staff', 'staff.google@example.test');
    staff.googleId = 'staff-google-subject';
    await staff.save();
    let restoreVerifier = stubGoogleTicket(googleClaims({
      sub: 'different-google-subject',
      email: passwordUser.email,
      name: 'Different Google',
    }));
    const originalSave = CustomerProfile.prototype.save;
    try {
      const conflict = await api('POST', '/api/auth/google', {
        ip: '198.51.100.20',
        body: { idToken: 'header.payload.signature' },
      });
      const sameEmail = await User.find({ email: passwordUser.email });
      assert.equal(conflict.status, 409);
      assert.equal(conflict.body.message, GOOGLE_MESSAGES.conflict);
      assert.equal(sameEmail.length, 1);

      restoreVerifier();
      restoreVerifier = stubGoogleTicket(googleClaims({
        sub: 'staff-google-subject',
        email: staff.email,
        name: 'Staff Google',
      }));
      const staffResult = await api('POST', '/api/auth/google', {
        ip: '198.51.100.21',
        body: { idToken: 'header.payload.signature' },
      });
      assert.equal(staffResult.status, 403);
      assert.equal(staffResult.body.message, GOOGLE_MESSAGES.forbidden);

      restoreVerifier();
      restoreVerifier = stubGoogleTicket(googleClaims({
        sub: 'rollback-google-subject',
        email: 'rollback.google@example.test',
        name: 'Rollback Person',
      }));
      CustomerProfile.prototype.save = function rejectIncomplete(...args: unknown[]) {
        if (this.get('name') === 'Rollback Person') {
          return Promise.reject(new Error('profile write failed'));
        }
        return originalSave.apply(this, args as []);
      };
      const failed = await api('POST', '/api/auth/google', {
        ip: '198.51.100.22',
        body: { idToken: 'header.payload.signature' },
      });
      const leftover = await User.findOne({ googleId: 'rollback-google-subject' });
      assert.equal(failed.status, 500);
      assert.equal(failed.body.message, 'Google sign-in failed');
      assert.equal(JSON.stringify(failed.body).includes('profile write failed'), false);
      assert.equal(leftover, null);
    } finally {
      CustomerProfile.prototype.save = originalSave;
      restoreVerifier();
      restoreEnv();
    }
  });

  it('keeps one customer when two Google sign-ups use the same subject', async () => {
    const restoreEnv = useGoogleTestEnv();
    const restoreVerifier = stubGoogleTicket(googleClaims({
      sub: 'race-google-subject',
      email: 'race.google@example.test',
      name: 'Race Google',
    }));
    try {
      const [first, second] = await Promise.all([
        api('POST', '/api/auth/google', { ip: '198.51.100.30', body: { idToken: 'header.payload.signature' } }),
        api('POST', '/api/auth/google', { ip: '198.51.100.31', body: { idToken: 'header.payload.signature' } }),
      ]);
      const users = await User.find({ googleId: 'race-google-subject' });
      const profiles = users[0] ? await CustomerProfile.find({ userId: users[0]._id }) : [];
      const statuses = [first.status, second.status].sort();

      assert.deepEqual(statuses, [200, 200]);
      assert.equal(users.length, 1);
      assert.equal(users[0]?.role, 'customer');
      assert.equal(profiles.length, 1);
    } finally {
      restoreVerifier();
      restoreEnv();
    }
  });
});

const GOOGLE_TEST_AUDIENCE = 'test-web.apps.googleusercontent.com';

const useGoogleTestEnv = () => {
  const previous = {
    GOOGLE_OAUTH_CLIENT_IDS: process.env.GOOGLE_OAUTH_CLIENT_IDS,
    GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID,
    GOOGLE_WEB_CLIENT_SECRET: process.env.GOOGLE_WEB_CLIENT_SECRET,
    GOOGLE_ANDROID_CLIENT_ID: process.env.GOOGLE_ANDROID_CLIENT_ID,
    GOOGLE_OAUTH_REDIRECT_URIS: process.env.GOOGLE_OAUTH_REDIRECT_URIS,
  };
  process.env.GOOGLE_OAUTH_CLIENT_IDS = `${GOOGLE_TEST_AUDIENCE},test-android.apps.googleusercontent.com`;
  process.env.GOOGLE_WEB_CLIENT_ID = GOOGLE_TEST_AUDIENCE;
  process.env.GOOGLE_WEB_CLIENT_SECRET = 'test-web-client-secret';
  process.env.GOOGLE_ANDROID_CLIENT_ID = 'test-android.apps.googleusercontent.com';
  process.env.GOOGLE_OAUTH_REDIRECT_URIS = 'http://localhost:8081';
  return () => {
    (Object.keys(previous) as Array<keyof typeof previous>).forEach((key) => {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  };
};

const googleClaims = (overrides: Record<string, unknown> = {}) => ({
  sub: 'google-subject',
  email: 'google.customer@example.test',
  email_verified: true,
  iss: 'https://accounts.google.com',
  aud: GOOGLE_TEST_AUDIENCE,
  exp: Math.floor(Date.now() / 1000) + 3600,
  name: 'Google Customer',
  ...overrides,
});

const stubGoogleTicket = (payload: Record<string, unknown> | Error) => {
  const original = OAuth2Client.prototype.verifyIdToken;
  OAuth2Client.prototype.verifyIdToken = (async () => {
    if (payload instanceof Error) throw payload;
    return { getPayload: () => payload };
  }) as typeof original;
  return () => {
    OAuth2Client.prototype.verifyIdToken = original;
  };
};
