import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../errors/app-error';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: any[] | undefined = undefined;
  let isOperational = false;

  // Check if it is a known operational application error
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
    isOperational = err.isOperational;
  } else if (err.name === 'ValidationError') {
    // Mongoose Validation Error
    statusCode = 400;
    message = 'Database validation failed';
    isOperational = true;
  } else if (err.name === 'CastError') {
    // Mongoose Invalid ID cast
    statusCode = 400;
    message = 'Invalid resource identifier';
    isOperational = true;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid secure authentication token';
    isOperational = true;
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
    isOperational = true;
  }

  // Log error details
  if (statusCode >= 500) {
    logger.error(`[Unhandled Error] ${req.method} ${req.originalUrl} - Error: ${err.message}\nStack: ${err.stack}`);
  } else {
    logger.warn(`[Operational Error] ${req.method} ${req.originalUrl} - Status: ${statusCode} - Message: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
    ...(errors && { errors }),
    ...(env.NODE_ENV === 'development' && {
      stack: err.stack,
      rawError: err,
    }),
  });
};
