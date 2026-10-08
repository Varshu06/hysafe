import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.util";
import { User } from "../models/User.model";
import { sessionRejection } from "../services/session.policy";

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select("-password");
    const rejection = sessionRejection(user, { iat: decoded.iat });

    if (rejection === "missing" || rejection === "inactive") {
      return res.status(401).json({ message: "User not found or inactive" });
    }
    if (rejection === "revoked") {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
