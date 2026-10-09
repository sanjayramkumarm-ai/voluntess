import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthReq extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const protect = (
  req: AuthReq,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Please log in" });
  }

  try {
    req.user = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as any;

    next();
  } catch {
    res.status(401).json({
      message: "Session expired. Log in again"
    });
  }
};

export const allow = (...roles: string[]) =>
  (req: AuthReq, res: Response, next: NextFunction) =>
    roles.includes(req.user!.role)
      ? next()
      : res.status(403).json({ message: "Not allowed" });
