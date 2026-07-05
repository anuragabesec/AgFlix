import express, { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { validateRequest } from '../middlewares/validation.middleware';
import { authenticateUser } from '../middlewares/auth.middleware';
import * as paymentDto from '../dto/payment.dto';

const router = Router();

// Retrieve all plan details (Public)
router.get('/plans', paymentController.getPlans);

// Raw Buffer Webhook route (needs to go before global body parsing, or specify raw parser)
router.post(
  '/webhook/stripe',
  express.raw({ type: 'application/json' }),
  paymentController.stripeWebhook
);

// Protected routes below
router.use(authenticateUser);

router.post(
  '/checkout',
  validateRequest({ body: paymentDto.createCheckoutSessionSchema }),
  paymentController.createCheckout
);

router.post(
  '/coupon/validate',
  validateRequest({ body: paymentDto.validateCouponSchema }),
  paymentController.validateCoupon
);

router.post(
  '/razorpay/verify',
  paymentController.razorpayVerify
);

router.post(
  '/sandbox/complete',
  paymentController.sandboxComplete
);

router.post(
  '/cancel',
  paymentController.cancelSubscription
);

router.get(
  '/status',
  paymentController.getSubscriptionStatus
);

router.get(
  '/history',
  paymentController.getPaymentHistory
);

export default router;
