import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    status: 429,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  handler: (req: Request, res: Response, next, options) => {
    logger.warn(`[Rate Limit Triggered] IP: ${req.ip} - Route: ${req.originalUrl}`);
    res.status(options.statusCode).send(options.message);
  },
});

// Strict rate limiter for Login and Auth verification endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 429,
    message: 'Too many authentication attempts, please try again after 15 minutes',
  },
  handler: (req: Request, res: Response, next, options) => {
    logger.warn(`[Brute Force Limiter Triggered] IP: ${req.ip} - Route: ${req.originalUrl}`);
    res.status(options.statusCode).send(options.message);
  },
});

// Strict limiter for sending OTPs
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // Limit each IP to 3 OTP requests per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 429,
    message: 'Too many OTP requests. Please wait 10 minutes before requesting a new code.',
  },
  handler: (req: Request, res: Response, next, options) => {
    logger.warn(`[OTP Mail Limiter Triggered] IP: ${req.ip} - Route: ${req.originalUrl}`);
    res.status(options.statusCode).send(options.message);
  },
});
