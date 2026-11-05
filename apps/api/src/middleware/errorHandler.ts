import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn(`Handled error on ${req.method} ${req.url}: ${err.message}`, {
      code: err.code,
      details: err.details,
    });
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? null,
      },
    });
    return;
  }

  // Unhandled / Internal Server Error
  logger.error(`Unhandled error on ${req.method} ${req.url}: ${err.message}`, {
    stack: err.stack,
  });

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred. Please try again later.",
      details: null,
    },
  });
}
