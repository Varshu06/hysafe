import jwt from 'jsonwebtoken';
import config from '../config/env';

export interface JWTPayload {
  userId: string;
  role: string;
  email: string;
}

/**
 * Generate JWT token
 */
export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, config.jwtSecret) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

