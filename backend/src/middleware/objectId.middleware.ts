import { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';

export const validateObjectId = (
  _req: Request,
  res: Response,
  next: NextFunction,
  value: string,
  paramName: string,
): void => {
  if (!Types.ObjectId.isValid(value)) {
    res.status(400).json({
      message: `Invalid ${paramName}`,
    });
    return;
  }

  next();
};
