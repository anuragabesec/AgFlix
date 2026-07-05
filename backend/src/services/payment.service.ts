import Stripe from 'stripe';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/environment';
import { logger } from '../utils/logger';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { Coupon } from '../models/coupon.model';
import { Subscription } from '../models/subscription.model';
import { User } from '../models/user.model';
import { BadRequestError, NotFoundError } from '../errors/app-error';

// Plan configuration
export interface PlanConfig {
  name: 'mobile' | 'basic' | 'standard' | 'premium';
  priceINR: number;
  resolution: string;
  concurrentStreams: number;
  devices: string[];
}

export const PLANS: Record<string, PlanConfig> = {
  mobile: {
    name: 'mobile',
    priceINR: 149,
    resolution: '480p (SD)',
    concurrentStreams: 1,
    devices: ['Phone', 'Tablet'],
  },
  basic: {
    name: 'basic',
    priceINR: 199,
    resolution: '720p (HD)',
    concurrentStreams: 1,
    devices: ['Phone', 'Tablet', 'Computer'],
  },
  standard: {
    name: 'standard',
    priceINR: 499,
    resolution: '1080p (Full HD)',
    concurrentStreams: 2,
    devices: ['Phone', 'Tablet', 'Computer', 'TV'],
  },
  premium: {
    name: 'premium',
    priceINR: 649,
    resolution: '4K + HDR',
    concurrentStreams: 4,
    devices: ['Phone', 'Tablet', 'Computer', 'TV'],
  },
};

export class PaymentService {
  private stripe: Stripe | null = null;
  private razorpay: Razorpay | null = null;
  private readonly subscriptionRepository: SubscriptionRepository;
  private readonly paymentRepository: PaymentRepository;

  constructor() {
    this.subscriptionRepository = new SubscriptionRepository();
    this.paymentRepository = new PaymentRepository();

    if (env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-04-10' as any,
      });
    }

    if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
      this.razorpay = new Razorpay({
        key_id: env.RAZORPAY_KEY_ID,
        key_secret: env.RAZORPAY_KEY_SECRET,
      });
    }
  }

  public async validateCouponCode(code: string, planName: 'mobile' | 'basic' | 'standard' | 'premium'): Promise<{ coupon: any; discountAmount: number; finalPrice: number }> {
    const plan = PLANS[planName];
    if (!plan) {
      throw new BadRequestError('Invalid plan name');
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), active: true });
    if (!coupon) {
      throw new NotFoundError('Promo code is invalid or inactive');
    }

    // Expiry check
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      coupon.active = false;
      await coupon.save();
      throw new BadRequestError('Promo code has expired');
    }

    // Max redemptions check
    if (coupon.maxRedemptions && coupon.redemptionsCount >= coupon.maxRedemptions) {
      coupon.active = false;
      await coupon.save();
      throw new BadRequestError('Promo code maximum usage limit reached');
    }

    const discountAmount = Math.round((plan.priceINR * coupon.discountPercentage) / 100);
    const finalPrice = Math.max(0, plan.priceINR - discountAmount);

    return {
      coupon: {
        code: coupon.code,
        discountPercentage: coupon.discountPercentage,
      },
      discountAmount,
      finalPrice,
    };
  }

  public async createCheckoutSession(
    userId: string,
    planName: 'mobile' | 'basic' | 'standard' | 'premium',
    gateway: 'stripe' | 'razorpay',
    couponCode?: string
  ): Promise<{ url?: string; orderId?: string; amount?: number; currency?: string; keyId?: string }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const plan = PLANS[planName];
    if (!plan) {
      throw new BadRequestError('Invalid plan selected');
    }

    let finalPrice = plan.priceINR;
    let discountApplied = false;

    if (couponCode) {
      try {
        const validation = await this.validateCouponCode(couponCode, planName);
        finalPrice = validation.finalPrice;
        discountApplied = true;
      } catch (err) {
        logger.warn(`Failed to apply coupon ${couponCode} for user ${userId}: ${(err as Error).message}`);
      }
    }

    // 1. STRIPE GATEWAY FLOW
    if (gateway === 'stripe') {
      if (this.stripe) {
        // Create actual Stripe Checkout Session
        const session = await this.stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'inr',
                product_data: {
                  name: `AgFlix ${planName.toUpperCase()} Plan`,
                  description: `${plan.resolution} Streaming up to ${plan.concurrentStreams} screen(s)`,
                },
                unit_amount: finalPrice * 100, // Stripe expects amount in cents/paise
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${env.FRONTEND_URL}/checkout-status?status=success&gateway=stripe&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${env.FRONTEND_URL}/checkout-status?status=cancel`,
          metadata: {
            userId,
            planName,
            couponCode: discountApplied ? couponCode || null : null,
          },
        });

        return { url: session.url || undefined };
      } else {
        // Stripe credentials missing -> Fallback Sandbox Mode
        logger.info(`Stripe Checkout requested in local sandbox mode for plan: ${planName}`);
        const mockSessionId = 'mock_stripe_session_' + crypto.randomBytes(16).toString('hex');
        
        // Return a mock url redirecting to client CheckoutStatus directly
        const mockUrl = `${env.FRONTEND_URL}/checkout-status?status=success&gateway=stripe&session_id=${mockSessionId}&planName=${planName}&couponCode=${couponCode || ''}`;
        return { url: mockUrl };
      }
    }

    // 2. RAZORPAY GATEWAY FLOW
    if (gateway === 'razorpay') {
      const amountPaise = finalPrice * 100;
      if (this.razorpay) {
        const order = await this.razorpay.orders.create({
          amount: amountPaise,
          currency: 'INR',
          receipt: `receipt_plan_${planName}_${userId.substring(18)}`,
          notes: {
            userId,
            planName,
            couponCode: discountApplied ? couponCode || null : null,
          },
        });

        return {
          orderId: order.id,
          amount: order.amount as number,
          currency: order.currency,
          keyId: env.RAZORPAY_KEY_ID,
        };
      } else {
        // Razorpay credentials missing -> Sandbox simulation
        logger.info(`Razorpay Order requested in local sandbox mode for plan: ${planName}`);
        const mockOrderId = 'order_mock_' + crypto.randomBytes(12).toString('hex');
        return {
          orderId: mockOrderId,
          amount: amountPaise,
          currency: 'INR',
          keyId: 'rzp_test_mock_key_id',
        };
      }
    }

    throw new BadRequestError('Unsupported payment gateway provider');
  }

  // Stripe Webhook Processor
  public async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.stripe || !env.STRIPE_WEBHOOK_SECRET) {
      logger.warn('Stripe SDK or Webhook Secret is unconfigured. Webhook bypass triggered.');
      return;
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      logger.error(`Stripe Webhook Signature Verification Failed: ${err.message}`);
      throw new BadRequestError('Invalid Stripe Webhook Signature');
    }

    logger.info(`Stripe Webhook event received: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.metadata?.userId;
      const planName = session.metadata?.planName as 'mobile' | 'basic' | 'standard' | 'premium';
      const couponCode = session.metadata?.couponCode;

      if (userId && planName) {
        await this.fulfillSubscription(userId, planName, 'stripe', session.id, session.amount_total ? session.amount_total / 100 : 0, couponCode);
      }
    }
  }

  // Razorpay Webhook Signature Verification
  public async handleRazorpayPaymentVerify(data: any): Promise<void> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, planName, couponCode, amount } = data;

    // Signature verification logic
    if (this.razorpay) {
      const generated_signature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET as string)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        throw new BadRequestError('Razorpay payment signature mismatch check failed');
      }
    }

    // Fulfill subscription
    const amountVal = amount ? Number(amount) / 100 : PLANS[planName as string]?.priceINR || 0;
    await this.fulfillSubscription(userId, planName, 'razorpay', razorpay_order_id, amountVal, couponCode);
  }

  // Sandbox success simulator directly from frontend status check
  public async handleSandboxCheckoutSuccess(userId: string, planName: 'mobile' | 'basic' | 'standard' | 'premium', gateway: 'stripe' | 'razorpay', txnId: string, couponCode?: string): Promise<void> {
    logger.info(`Fulfilling mock sandbox transaction for user ${userId} on plan ${planName}`);
    const plan = PLANS[planName];
    let finalPrice = plan.priceINR;

    if (couponCode) {
      try {
        const val = await this.validateCouponCode(couponCode, planName);
        finalPrice = val.finalPrice;
      } catch (err) {}
    }

    await this.fulfillSubscription(userId, planName, gateway, txnId, finalPrice, couponCode);
  }

  // Internal transaction logic
  private async fulfillSubscription(
    userId: string,
    planName: 'mobile' | 'basic' | 'standard' | 'premium',
    gateway: 'stripe' | 'razorpay',
    transactionId: string,
    amountPaid: number,
    couponCode?: string
  ): Promise<void> {
    // 1. Calculate active period
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1); // 30 days / 1 month duration

    // 2. Check if user already has an active subscription
    let subscription = await Subscription.findOne({ userId });

    if (subscription) {
      subscription.planName = planName;
      subscription.status = 'active';
      subscription.currentPeriodStart = start;
      subscription.currentPeriodEnd = end;
      subscription.cancelAtPeriodEnd = false;
      if (gateway === 'stripe') {
        subscription.stripeSubscriptionId = transactionId;
      } else {
        subscription.razorpaySubscriptionId = transactionId;
      }
      await subscription.save();
    } else {
      subscription = await Subscription.create({
        userId,
        planName,
        status: 'active',
        currentPeriodStart: start,
        currentPeriodEnd: end,
        cancelAtPeriodEnd: false,
        ...(gateway === 'stripe' ? { stripeSubscriptionId: transactionId } : { razorpaySubscriptionId: transactionId }),
      });
    }

    // 3. Create local invoice/payment log
    await this.paymentRepository.create({
      userId,
      subscriptionId: subscription._id,
      paymentGateway: gateway,
      transactionId,
      amount: amountPaid,
      currency: 'INR',
      status: 'succeeded',
    });

    // 4. Update coupon usage count if used
    if (couponCode) {
      const couponObj = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (couponObj) {
        couponObj.redemptionsCount += 1;
        if (couponObj.maxRedemptions && couponObj.redemptionsCount >= couponObj.maxRedemptions) {
          couponObj.active = false;
        }
        await couponObj.save();
      }
    }

    logger.info(`Subscription activated successfully for User: ${userId} - Plan: ${planName}`);
  }

  // Cancel subscription request
  public async cancelSubscription(userId: string): Promise<void> {
    const subscription = await Subscription.findOne({ userId, status: 'active' });
    if (!subscription) {
      throw new NotFoundError('No active subscription found to cancel');
    }

    // Set auto-renew to false
    subscription.cancelAtPeriodEnd = true;
    await subscription.save();

    logger.info(`Auto-renew cancelled for user subscription ${userId}`);
  }
}
export default PaymentService;
