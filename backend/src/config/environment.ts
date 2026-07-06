import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const environmentSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().url({ message: 'MONGODB_URI must be a valid MongoDB URL' }),
  
  // JWT Configuration
  JWT_ACCESS_SECRET: z.string().min(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters long' }),
  JWT_REFRESH_SECRET: z.string().min(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters long' }),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  
  // Security
  COOKIE_SECRET: z.string().min(32, { message: 'COOKIE_SECRET must be at least 32 characters long' }),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  
  // SMTP Configuration (Email OTP / Notifications)
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().email().optional().or(z.literal('')),
  SMTP_PASS: z.string().optional().or(z.literal('')),
  EMAIL_FROM: z.string().default('AgFlix Support <noreply@agflix.com>'),
  
  // Payments
  STRIPE_SECRET_KEY: z.string().optional().or(z.literal('')),
  STRIPE_WEBHOOK_SECRET: z.string().optional().or(z.literal('')),
  RAZORPAY_KEY_ID: z.string().optional().or(z.literal('')),
  RAZORPAY_KEY_SECRET: z.string().optional().or(z.literal('')),
  
  // Resend API
  RESEND_API_KEY: z.string().optional().or(z.literal('')),
  
  // Brevo API
  BREVO_API_KEY: z.string().optional().or(z.literal('')),
  
  // Plunk API
  PLUNK_API_KEY: z.string().optional().or(z.literal('')),
  
  // Pipedream Webhook
  PIPEDREAM_WEBHOOK_URL: z.string().url().optional().or(z.literal('')),
});

export type Environment = z.infer<typeof environmentSchema>;

const parseEnvironment = (): Environment => {
  const result = environmentSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnvironment();
