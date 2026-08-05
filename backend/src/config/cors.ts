const defaultDevelopmentOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8081',
  'http://localhost:19000',
  'http://localhost:19006',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:19000',
  'http://127.0.0.1:19006',
];

const getAllowedCorsOrigins = (): string[] => {
  const configuredOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins.length > 0
    ? configuredOrigins
    : defaultDevelopmentOrigins;
};

export const corsOriginValidator = (
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
): void => {
  // Native mobile clients and non-browser tools do not send an Origin header.
  if (!origin) {
    callback(null, true);
    return;
  }

  callback(null, getAllowedCorsOrigins().includes(origin));
};
