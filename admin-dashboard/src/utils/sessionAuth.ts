const CREDENTIAL_ATTEMPTS = [
  '/auth/login',
  '/auth/register',
  '/auth/google',
  '/auth/forgot-password',
  '/auth/verify-otp',
  '/auth/reset-password',
];

export const requestPath = (url?: string): string => {
  if (!url) return '';
  const withoutQuery = url.split('?')[0];
  if (withoutQuery.startsWith('http://') || withoutQuery.startsWith('https://')) {
    try {
      return new URL(withoutQuery).pathname;
    } catch {
      return withoutQuery;
    }
  }
  return withoutQuery;
};

/** A 401 from login, signup, or other credential attempts is not a session expiry. */
export const shouldInvalidateSession = (status: number | undefined, url?: string): boolean => {
  if (status !== 401) return false;
  const path = requestPath(url);
  return !CREDENTIAL_ATTEMPTS.some((suffix) => path === suffix || path.endsWith(suffix));
};

export const isTemporaryNetworkFailure = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    isNetworkError?: boolean;
    isTimeout?: boolean;
    isCorsError?: boolean;
    code?: string;
    response?: unknown;
    message?: string;
  };
  if (candidate.response) return false;
  if (candidate.isNetworkError || candidate.isTimeout || candidate.isCorsError) return true;
  if (candidate.code === 'ERR_NETWORK' || candidate.code === 'ECONNABORTED' || candidate.code === 'ERR_CORS') return true;
  return typeof candidate.message === 'string' && /network|timeout|cors|connect/i.test(candidate.message);
};

/** Only an explicit 401 means the account or token is no longer valid. */
export const sessionCheckFailure = (error: unknown): 'invalid' | 'unreachable' => {
  if (!error || typeof error !== 'object') return 'unreachable';
  const status = (error as { response?: { status?: number } }).response?.status;
  return status === 401 ? 'invalid' : 'unreachable';
};
