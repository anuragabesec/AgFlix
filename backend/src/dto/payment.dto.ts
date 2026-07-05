import { z } from 'zod';

export const createCheckoutSessionSchema = z.object({
  planName: z.enum(['mobile', 'basic', 'standard', 'premium']),
  gateway: z.enum(['stripe', 'razorpay']),
  couponCode: z.string().trim().toUpperCase().optional(),
});

export const validateCouponSchema = z.object({
  couponCode: z.string().min(1, { message: 'Coupon code is required' }).trim().toUpperCase(),
  planName: z.enum(['mobile', 'basic', 'standard', 'premium']),
});
