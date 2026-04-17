import type {
  Request,
  Response,
  NextFunction
} from "express";

import type { HttpError } from "http-errors";

export function errorMiddleware(
  err: HttpError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
}