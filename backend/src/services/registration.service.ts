import { isDuplicateKeyError } from './googleIdentity.policy';
import { normalizeIndianMobilePhone } from '../utils/phone.util';

const CUSTOMER_TYPES = ['home', 'shop', 'hotel', 'bank', 'event'] as const;
type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const DUPLICATE_ACCOUNT_MESSAGE =
  'An account with this phone number or email already exists. Sign in instead.';
export const REGISTRATION_FAILED_MESSAGE = 'Registration failed. Please try again.';

export type RegistrationSession = unknown;

export interface NewCustomerRecord {
  _id: unknown;
  phone: string;
  email?: string;
  name?: string;
  role: 'admin' | 'staff' | 'customer';
  password?: string;
  toObject?: () => Record<string, unknown>;
}

export interface RegistrationDeps {
  findExisting: (phone: string, email?: string) => Promise<boolean>;
  insertUser: (
    user: Record<string, unknown>,
    session: RegistrationSession | null,
  ) => Promise<NewCustomerRecord>;
  insertProfile: (
    profile: Record<string, unknown>,
    session: RegistrationSession | null,
  ) => Promise<void>;
  deleteCreatedUser: (userId: unknown) => Promise<void>;
  runTransaction: <T>(
    fn: (session: RegistrationSession | null) => Promise<T>,
  ) => Promise<T>;
  hashPassword: (password: string) => Promise<string>;
}

export type RegistrationOutcome =
  | { ok: true; user: Record<string, unknown> }
  | { ok: false; status: 400 | 500; message: string };

const validationError = (message: string): RegistrationOutcome => ({
  ok: false,
  status: 400,
  message,
});

const normalizeEmail = (email: unknown): string | undefined => {
  if (typeof email !== 'string') return undefined;
  const trimmed = email.trim().toLowerCase();
  return trimmed || undefined;
};

const publicUser = (user: NewCustomerRecord): Record<string, unknown> => {
  const raw = user.toObject ? user.toObject() : { ...user };
  delete raw.password;
  return raw;
};

export const registrationErrorLog = (error: unknown): Record<string, unknown> => {
  if (!error || typeof error !== 'object') return { message: 'unknown' };
  const candidate = error as {
    name?: string;
    code?: number;
    message?: string;
    keyPattern?: Record<string, unknown>;
  };
  return {
    name: candidate.name,
    code: candidate.code,
    keyPattern: candidate.keyPattern ? Object.keys(candidate.keyPattern) : undefined,
    message: candidate.code === 11000 ? 'duplicate key' : candidate.message,
  };
};

/**
 * Builds a customer account from public registration input.
 * A client-supplied role is never read. Unique indexes remain the race protection.
 */
export const createCustomerAccount = async (
  input: object,
  deps: RegistrationDeps,
): Promise<RegistrationOutcome> => {
  const body = input as Record<string, unknown>;
  const phoneInput = typeof body.phone === 'number' ? String(body.phone) : body.phone;
  const phoneMissing =
    phoneInput === undefined ||
    phoneInput === null ||
    (typeof phoneInput === 'string' && phoneInput.trim() === '');
  const phone = phoneMissing ? null : normalizeIndianMobilePhone(phoneInput);
  const password = typeof body.password === 'string' ? body.password : '';
  const email = normalizeEmail(body.email);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  const customerType = body.customerType;

  if (phoneMissing || !password) {
    return validationError('Phone and password are required');
  }
  if (!phone) {
    return validationError('Phone number must be 10 digits');
  }
  if (password.length < 6) {
    return validationError('Password must be at least 6 characters');
  }
  if (
    customerType !== undefined &&
    (typeof customerType !== 'string' || !CUSTOMER_TYPES.includes(customerType as CustomerType))
  ) {
    return validationError('Customer type is invalid');
  }

  if (await deps.findExisting(phone, email)) {
    return { ok: false, status: 400, message: DUPLICATE_ACCOUNT_MESSAGE };
  }

  const hashedPassword = await deps.hashPassword(password);
  const userData: Record<string, unknown> = {
    phone,
    password: hashedPassword,
    role: 'customer',
  };
  if (name) userData.name = name;
  if (email) userData.email = email;
  const profileData = {
    name: name || 'Customer',
    address: address || 'Address not provided',
    customerType: (customerType as CustomerType) || 'home',
    paymentTerms: 'one-time' as const,
    defaultPaymentMethod: 'offline' as const,
  };

  try {
    const created = await deps.runTransaction(async (session) => {
      const user = await deps.insertUser(userData, session);
      try {
        await deps.insertProfile({ ...profileData, userId: user._id }, session);
      } catch (profileError) {
        if (!session) {
          try {
            await deps.deleteCreatedUser(user._id);
          } catch (cleanupError) {
            console.error('Registration cleanup failed:', registrationErrorLog(cleanupError));
          }
        }
        throw profileError;
      }
      return user;
    });

    const user = publicUser(created);
    if (user.role !== 'customer') {
      return { ok: false, status: 500, message: REGISTRATION_FAILED_MESSAGE };
    }
    return { ok: true, user };
  } catch (error) {
    console.error('Registration error:', registrationErrorLog(error));
    if (isDuplicateKeyError(error)) {
      return { ok: false, status: 400, message: DUPLICATE_ACCOUNT_MESSAGE };
    }
    return { ok: false, status: 500, message: REGISTRATION_FAILED_MESSAGE };
  }
};
