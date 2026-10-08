import crypto from 'crypto';

/** Known development fallback. Production must never hash OTPs with this value. */
export const DEV_OTP_SALT_FALLBACK = 'hysafe_secure_otp_salt_2026';

export const FORGOT_PASSWORD_MESSAGE =
  'If an account exists, a verification code has been sent.';

export const OTP_UNAVAILABLE_MESSAGE =
  'Password reset is temporarily unavailable. Please try again later.';

export const OTP_INVALID_MESSAGE = 'Invalid or expired OTP code';
export const OTP_LOCKED_MESSAGE =
  'Maximum verification attempts exceeded. Please request a new OTP code.';
export const OTP_REUSED_MESSAGE = 'OTP has already been used. Please request a new OTP code.';

const MIN_SALT_LENGTH = 16;

export const devOtpLogAllowed = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.NODE_ENV === 'development';

export const resolveOtpSalt = (
  env: NodeJS.ProcessEnv = process.env,
): { ok: true; salt: string } | { ok: false } => {
  const configured = env.OTP_SALT?.trim() || '';
  const weak =
    !configured || configured === DEV_OTP_SALT_FALLBACK || configured.length < MIN_SALT_LENGTH;
  if (!weak) return { ok: true, salt: configured };
  if (env.NODE_ENV === 'development') {
    return { ok: true, salt: configured || DEV_OTP_SALT_FALLBACK };
  }
  return { ok: false };
};

export const hashOtp = (otp: string, salt: string): string =>
  crypto.createHash('sha256').update(`${otp}${salt}`).digest('hex');

export const otpHashesMatch = (storedHash: string, submittedHash: string): boolean => {
  const stored = Buffer.from(storedHash);
  const submitted = Buffer.from(submittedHash);
  if (stored.length === 0 || stored.length !== submitted.length) return false;
  return crypto.timingSafeEqual(stored, submitted);
};

export interface OtpAttemptState {
  attempts: number;
  maxAttempts: number;
  isUsed: boolean;
  isVerified: boolean;
  expiresAt: Date;
}

export type OtpAttemptResult = 'match' | 'invalid' | 'locked' | 'expired' | 'used';

export const evaluateOtpAttempt = (
  record: OtpAttemptState | null,
  submittedHash: string,
  storedHash: string,
  now = new Date(),
): OtpAttemptResult => {
  if (!record) return 'invalid';
  if (record.isUsed) return 'used';
  if (record.expiresAt.getTime() <= now.getTime()) return 'expired';
  if (record.attempts >= record.maxAttempts) return 'locked';
  if (!otpHashesMatch(storedHash, submittedHash)) {
    return record.attempts + 1 >= record.maxAttempts ? 'locked' : 'invalid';
  }
  return 'match';
};

export const canConsumeVerifiedOtp = (record: OtpAttemptState, now = new Date()): boolean =>
  record.isVerified &&
  !record.isUsed &&
  record.expiresAt.getTime() > now.getTime() &&
  record.attempts < record.maxAttempts;

export interface ForgotPasswordDecisionInput {
  saltOk: boolean;
  providerReady: boolean;
  production: boolean;
  userExists: boolean;
  hasEmail: boolean;
  cooldown: boolean;
  delivered: boolean;
}

/** Same public response for unknown accounts, phone-only accounts, cooldown, and delivery failure. */
export const decideForgotPassword = (
  input: ForgotPasswordDecisionInput,
): { status: 200 | 503; message: string; send: boolean } => {
  if (!input.saltOk || (input.production && !input.providerReady)) {
    return { status: 503, message: OTP_UNAVAILABLE_MESSAGE, send: false };
  }
  if (!input.userExists || !input.hasEmail || input.cooldown || !input.delivered) {
    return { status: 200, message: FORGOT_PASSWORD_MESSAGE, send: false };
  }
  return { status: 200, message: FORGOT_PASSWORD_MESSAGE, send: true };
};
