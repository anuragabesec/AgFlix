import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/environment';
import { errorHandler } from './middlewares/error.middleware';
import { NotFoundError } from './errors/app-error';
import { logger } from './utils/logger';

import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import paymentRoutes from './routes/payment.routes';
import movieRoutes from './routes/movie.routes';

const app: Express = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://*.unsplash.com"],
        connectSrc: ["'self'", "ws:", "wss:", "http://localhost:5000", "http://localhost:5173", "https://api.razorpay.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "data:", "blob:", "http://localhost:5000", "http://127.0.0.1:5000", "https://commondatastorage.googleapis.com"],
        frameSrc: ["'self'", "https://api.razorpay.com"],
      },
    },
  })
);

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-device-id', 'x-profile-id', 'Range'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
  })
);

// Body Parsers
app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, res, buf) => {
      if (req.originalUrl && req.originalUrl.includes('/webhook/stripe')) {
        req.rawBody = buf;
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie Parser
app.use(cookieParser(env.COOKIE_SECRET));

// Logger middleware for incoming requests
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.http(`${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Register routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profiles', profileRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/movies', movieRoutes);

// Mock/Default API root check
app.get('/api/v1', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the AgFlix API (v1)',
  });
});

// Fallback for non-existent routes
app.use('*', (req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`Endpoint ${req.originalUrl} does not exist.`));
});

// Global Error Handler
app.use(errorHandler);

export default app;
