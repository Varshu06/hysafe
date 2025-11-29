import { NextFunction, Response } from 'express';
import { AuthRequest } from '../types/express.d';

type Role = 'admin' | 'staff' | 'customer';

/**
 * Role-based access control middleware
 */
export const authorize = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role as Role)) {
      res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
};

