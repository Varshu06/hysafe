import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { registerSchema } from '../validators/auth.validation';
import { normalizeIndianMobilePhone } from '../utils/phone.util';
import {
  createCustomerAccount,
  DUPLICATE_ACCOUNT_MESSAGE,
  NewCustomerRecord,
  REGISTRATION_FAILED_MESSAGE,
  RegistrationDeps,
} from './registration.service';

const validInput = {
  name: 'Asha',
  email: 'Asha@Example.com',
  phone: '+91 98765 43210',
  password: 'secret1',
  address: 'Valliyur',
  customerType: 'home',
  role: 'admin',
};

const harness = (overrides: Partial<RegistrationDeps> = {}) => {
  const users = new Map<string, Record<string, unknown>>();
  users.set('existing', { _id: 'existing', phone: '9000000000', email: 'old@example.com', role: 'customer' });
  const deleted: unknown[] = [];
  const profiles: Record<string, unknown>[] = [];
  let sequence = 0;
  const deps: RegistrationDeps = {
    findExisting: async (phone, email) =>
      [...users.values()].some((user) => user.phone === phone || (email && user.email === email)),
    insertUser: async (data) => {
      if ([...users.values()].some((user) => user.phone === data.phone || (data.email && user.email === data.email))) {
        const error = new Error('E11000 duplicate key error collection: users index: phone_1') as Error & {
          code: number;
          keyPattern: Record<string, number>;
        };
        error.code = 11000;
        error.keyPattern = data.phone && [...users.values()].some((user) => user.phone === data.phone)
          ? { phone: 1 }
          : { email: 1 };
        throw error;
      }
      const record = {
        _id: `created-${++sequence}`,
        phone: String(data.phone),
        email: typeof data.email === 'string' ? data.email : undefined,
        name: typeof data.name === 'string' ? data.name : undefined,
        role: data.role,
        password: String(data.password),
      } as NewCustomerRecord;
      users.set(String(record._id), { ...record });
      return record;
    },
    insertProfile: async (profile) => {
      profiles.push(profile);
    },
    deleteCreatedUser: async (userId) => {
      deleted.push(userId);
      users.delete(String(userId));
    },
    runTransaction: async (fn) => fn(null),
    hashPassword: async (password) => `hashed:${password}`,
    ...overrides,
  };
  return { deps, users, deleted, profiles };
};

describe('phone normalization', () => {
  it('keeps a 10-digit mobile number and accepts a +91 prefix', () => {
    assert.equal(normalizeIndianMobilePhone('9876543210'), '9876543210');
    assert.equal(normalizeIndianMobilePhone('+91 98765-43210'), '9876543210');
  });

  it('rejects numbers that are not exactly 10 digits after normalization', () => {
    assert.equal(normalizeIndianMobilePhone('987654321'), null);
    assert.equal(normalizeIndianMobilePhone('98765432101'), null);
    assert.equal(normalizeIndianMobilePhone('123456789012'), null);
    assert.equal(normalizeIndianMobilePhone('abcdefghij'), null);
  });
});

describe('registration schema', () => {
  it('normalizes the phone number and still accepts extra fields', () => {
    const parsed = registerSchema.parse(validInput);
    assert.equal(parsed.phone, '9876543210');
    assert.equal(parsed.email, 'Asha@Example.com');
    assert.equal((parsed as { role?: string }).role, 'admin');
  });

  it('rejects an invalid phone number before the account is created', () => {
    const result = registerSchema.safeParse({ ...validInput, phone: '98765' });
    assert.equal(result.success, false);
  });
});

describe('customer registration', () => {
  it('creates a customer account and does not return the password', async () => {
    const { deps, profiles, users } = harness();
    const result = await createCustomerAccount(validInput, deps);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.user.role, 'customer');
    assert.equal(result.user.phone, '9876543210');
    assert.equal(result.user.email, 'asha@example.com');
    assert.equal('password' in result.user, false);
    assert.equal(profiles[0]?.customerType, 'home');
    assert.equal(profiles[0]?.address, 'Valliyur');
    assert.equal(users.get('existing')?.role, 'customer');
    const created = [...users.values()].find((user) => user.phone === '9876543210');
    assert.equal(created?.role, 'customer');
    assert.equal(created?.password, 'hashed:secret1');
  });

  it('ignores a client-supplied admin or staff role', async () => {
    const { deps } = harness();
    const adminResult = await createCustomerAccount({ ...validInput, role: 'admin' }, deps);
    const staffResult = await createCustomerAccount({
      ...validInput,
      phone: '9876543211',
      email: 'staff-try@example.com',
      role: 'staff',
    }, deps);

    assert.equal(adminResult.ok && adminResult.user.role, 'customer');
    assert.equal(staffResult.ok && staffResult.user.role, 'customer');
  });

  it('rejects an invalid phone number without creating records', async () => {
    const { deps, users } = harness();
    const result = await createCustomerAccount({ ...validInput, phone: '12345' }, deps);

    assert.deepEqual(result, { ok: false, status: 400, message: 'Phone number must be 10 digits' });
    assert.equal(users.size, 1);
  });

  it('returns one safe message for a duplicate phone number', async () => {
    const { deps, deleted } = harness();
    const result = await createCustomerAccount({ ...validInput, phone: '9000000000', email: 'new@example.com' }, deps);

    assert.deepEqual(result, { ok: false, status: 400, message: DUPLICATE_ACCOUNT_MESSAGE });
    assert.deepEqual(deleted, []);
  });

  it('returns the same safe message for a duplicate email', async () => {
    const { deps } = harness();
    const result = await createCustomerAccount({
      ...validInput,
      phone: '9876543212',
      email: 'OLD@example.com',
    }, deps);

    assert.deepEqual(result, { ok: false, status: 400, message: DUPLICATE_ACCOUNT_MESSAGE });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.message.includes('old@example.com'), false);
  });

  it('maps a concurrent duplicate-key error without deleting the existing account', async () => {
    const { deps, users, deleted } = harness({
      findExisting: async () => false,
    });
    const first = createCustomerAccount(validInput, deps);
    const second = createCustomerAccount(validInput, deps);
    const results = await Promise.all([first, second]);
    const failures = results.filter((result) => !result.ok);

    assert.equal(results.filter((result) => result.ok).length, 1);
    assert.equal(failures.length, 1);
    assert.equal(failures[0] && !failures[0].ok && failures[0].message, DUPLICATE_ACCOUNT_MESSAGE);
    assert.equal(failures[0] && !failures[0].ok && failures[0].message.includes('E11000'), false);
    assert.equal(users.has('existing'), true);
    assert.deepEqual(deleted, []);
  });

  it('deletes only the new user when profile creation fails outside a transaction', async () => {
    const { deps, users, deleted } = harness({
      insertProfile: async () => {
        throw new Error('MongoServerError: profile write failed');
      },
    });
    const result = await createCustomerAccount(validInput, deps);

    assert.deepEqual(result, { ok: false, status: 500, message: REGISTRATION_FAILED_MESSAGE });
    assert.equal(users.has('existing'), true);
    assert.equal([...users.values()].some((user) => user.phone === '9876543210'), false);
    assert.equal(deleted.length, 1);
    assert.notEqual(deleted[0], 'existing');
  });

  it('relies on transaction rollback and does not delete when a session is active', async () => {
    let aborted = false;
    const { deps, deleted } = harness({
      insertProfile: async () => {
        throw new Error('profile write failed inside transaction');
      },
      runTransaction: async (fn) => {
        try {
          return await fn({ id: 'transaction' });
        } catch (error) {
          aborted = true;
          throw error;
        }
      },
    });
    const result = await createCustomerAccount(validInput, deps);

    assert.equal(aborted, true);
    assert.deepEqual(deleted, []);
    assert.deepEqual(result, { ok: false, status: 500, message: REGISTRATION_FAILED_MESSAGE });
  });
});
