import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  role: string;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error('JWT_SECRET is required and must be set before starting the server');
  }

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    if (secret === 'your--secret-key' || secret === 'secret' || secret.length < 32) {
      throw new Error(
        'SECURITY ERROR: In production mode (NODE_ENV=production), JWT_SECRET cannot use default/weak placeholders and must be at least 32 characters long.'
      );
    }
  }

  return secret;
};

export const validateJwtConfiguration = (): void => {
  getJwtSecret();
};

export const generateToken = (payload: JWTPayload): string => {
  // Type assertion to bypass StringValue type requirement
  const options = {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions;
  // Convert to plain object to satisfy jwt.sign type requirements
  const plainPayload: Record<string, string> = {
    userId: payload.userId,
    role: payload.role,
  };
  return jwt.sign(plainPayload, getJwtSecret(), options);
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, getJwtSecret()) as JWTPayload;
};
