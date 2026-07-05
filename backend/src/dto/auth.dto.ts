import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters long' })
  .max(128)
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  .regex(/[0-9]/, { message: 'Password must contain at least one digit' })
  .regex(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' });

export const signupSchema = z
  .object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters long' }).max(50),
    email: z.string().email({ message: 'Must be a valid email address' }),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().email({ message: 'Must be a valid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
  rememberMe: z.boolean().optional().default(false),
  deviceId: z.string().min(8, { message: 'Device identification fingerprint is required' }),
  browser: z.string().optional(),
  os: z.string().optional(),
  ipAddress: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email({ message: 'Must be a valid email address' }),
  otpCode: z.string().length(6, { message: 'OTP must be exactly 6 digits long' }).regex(/^[0-9]+$/, { message: 'OTP must contain digits only' }),
  purpose: z.enum(['signup', 'password_reset']),
  deviceId: z.string().min(8, { message: 'Device fingerprint is required' }),
  browser: z.string().optional(),
  os: z.string().optional(),
  ipAddress: z.string().optional(),
});

export const resetPasswordRequestSchema = z.object({
  email: z.string().email({ message: 'Must be a valid email address' }),
});

export const resetPasswordConfirmSchema = z
  .object({
    email: z.string().email({ message: 'Must be a valid email address' }),
    otpCode: z.string().length(6, { message: 'OTP must be exactly 6 digits long' }),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const resendOtpSchema = z.object({
  email: z.string().email({ message: 'Must be a valid email address' }),
  purpose: z.enum(['signup', 'password_reset']),
});
