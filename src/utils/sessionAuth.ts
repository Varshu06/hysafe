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

/** True only when this request actually presented a HySafe bearer token. */
export const requestHadBearerToken = (headers: unknown): boolean => {
  if (!headers || typeof headers !== 'object') return false;
  const reader = headers as { get?: (name: string) => unknown; Authorization?: unknown; authorization?: unknown };
  const value = typeof reader.get === 'function'
    ? reader.get('Authorization') ?? reader.get('authorization')
    : reader.Authorization ?? reader.authorization;
  return typeof value === 'string' && /^Bearer\s+\S+/.test(value);
};

/**
 * A 401 can arrive from a request that started before login. That response must not
 * erase a token stored while the request was in flight.
 */
export const shouldClearStoredSession = (
  status: number | undefined,
  url: string | undefined,
  hadBearerToken: boolean,
): boolean => hadBearerToken && shouldInvalidateSession(status, url);

/** Private data loads only after startup session validation has finished successfully. */
export const canLoadPrivateData = (state: { isLoading: boolean; isAuthenticated: boolean }): boolean =>
  state.isAuthenticated && !state.isLoading;

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
