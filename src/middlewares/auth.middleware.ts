import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import jwt, { JwtPayload } from "jsonwebtoken";
import AppError from "../errors/AppError";
import { User } from "../models/user.model";

type AuthTokenPayload = JwtPayload & {
  userId?: string;
  tokenVersion?: number;
};

// ✅ Protect route (JWT authentication)
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) throw new AppError(httpStatus.UNAUTHORIZED, "Token not found");

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret"!
    ) as AuthTokenPayload;

    // Fetch user by ID from token
    const user = await User.findById(decoded.userId); // userId set in login token
    if (!user) {
      throw new AppError(httpStatus.UNAUTHORIZED, "User not found");
    }

    const currentTokenVersion = user.tokenVersion ?? 0;
    const decodedTokenVersion = decoded.tokenVersion ?? 0;
    if (currentTokenVersion !== decodedTokenVersion) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Session expired");
    }

    // Attach user to request

    

    // req.user = decoded;
    req.user = user;
    next();
  } catch (err) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Invalid or expired token " + err
    );
  }
};

// ✅ Role-based authorization middleware
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Access denied. Insufficient role permissions."
      );
    }
    next();
  };
};

// ✅ Type-based authorization middleware
export const authorizeTypes = (...types: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
    }

    if (req.user.role === 'admin' || req.user.role === 'administrator') {
      return next();
    }

    const userTypes = req.user.type;
    const hasType = types.includes(userTypes);

    if (!hasType) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Access denied. Insufficient type permissions."
      );
    }
    next();
  };
};
