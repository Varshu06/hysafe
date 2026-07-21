import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  role: string;
}

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
  return jwt.sign(plainPayload, JWT_SECRET, options);
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

