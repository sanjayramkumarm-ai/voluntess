import { Request, Response, NextFunction } from "express";

export const wrap =
  (fn: any) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(err);

  if (err?.code === 11000) {
    return res.status(409).json({
      message: "Already exists"
    });
  }

  if (err?.name === "ZodError") {
    return res.status(400).json({
      message: err.issues?.[0]?.message || "Invalid input"
    });
  }

  res.status(500).json({
    message: err?.message || "Server error"
  });
};
