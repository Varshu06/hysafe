import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  role: string;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is required and must be set before starting the server');
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
