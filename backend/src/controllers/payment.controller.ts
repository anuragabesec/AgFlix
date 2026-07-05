import { Request, Response, NextFunction, RequestHandler } from 'express';
import { PaymentService, PLANS } from '../services/payment.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { Subscription } from '../models/subscription.model';
import { BadRequestError } from '../errors/app-error';

const paymentService = new PaymentService();
const paymentRepository = new PaymentRepository();

export const getPlans: RequestHandler = (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    plans: Object.values(PLANS),
  });
};

export const createCheckout: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { planName, gateway, couponCode } = req.body;

    const session = await paymentService.createCheckoutSession(userId, planName, gateway, couponCode);
    res.status(200).json({
      success: true,
      ...session,
    });
  } catch (error) {
    next(error);
  }
};

export const validateCoupon: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { couponCode, planName } = req.body;
    const result = await paymentService.validateCouponCode(couponCode, planName);
    
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const stripeWebhook: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    if (!sig) {
      throw new BadRequestError('Missing Stripe Signature header');
    }

    // Capture raw body buffer
    const rawBody = (req as any).rawBody || req.body;
    await paymentService.handleStripeWebhook(rawBody, sig);

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

export const razorpayVerify: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    await paymentService.handleRazorpayPaymentVerify({
      ...req.body,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Razorpay payment verified & subscription active.',
    });
  } catch (error) {
    next(error);
  }
};

export const sandboxComplete: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { planName, gateway, transactionId, couponCode } = req.body;

    await paymentService.handleSandboxCheckoutSuccess(userId, planName, gateway, transactionId, couponCode);

    res.status(200).json({
      success: true,
      message: 'Local sandbox subscription completed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const cancelSubscription: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    await paymentService.cancelSubscription(userId);

    res.status(200).json({
      success: true,
      message: 'Your subscription renewal has been cancelled.',
    });
  } catch (error) {
    next(error);
  }
};

export const getSubscriptionStatus: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const subscription = await Subscription.findOne({ userId });

    res.status(200).json({
      success: true,
      subscription: subscription ? {
        planName: subscription.planName,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      } : null,
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentHistory: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const history = await paymentRepository.findByUserId(userId);

    res.status(200).json({
      success: true,
      history: history.map((p) => ({
        id: p._id,
        gateway: p.paymentGateway,
        transactionId: p.transactionId,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        date: p.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};
