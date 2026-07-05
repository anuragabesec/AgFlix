import request from 'supertest';
import app from '../app';
import Subscription from '../models/subscription.model';
import Payment from '../models/payment.model';
import Coupon from '../models/coupon.model';
import User from '../models/user.model';
import ActiveSession from '../models/session.model';
import { PLANS } from '../services/payment.service';
import jwt from 'jsonwebtoken';

// Mock mongoose models
jest.mock('../models/subscription.model');
jest.mock('../models/payment.model');
jest.mock('../models/coupon.model');
jest.mock('../models/user.model');
jest.mock('../models/session.model');
jest.mock('../models/audit-log.model');

describe('💳 Subscription & Payments Routes Integration Tests', () => {
  let mockToken = 'mock_jwt_auth_token';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock jwt.verify to bypass token validation check
    jest.spyOn(jwt, 'verify').mockImplementation(() => ({
      userId: 'mocked_user_id',
      email: 'jane@domain.com',
      role: 'user',
      tokenFamily: 'mock_token_family',
    }));

    // Mock User exists check in authenticateUser middleware
    (User.findById as jest.Mock).mockImplementation(() => {
      const userDoc = {
        _id: 'mocked_user_id',
        name: 'Jane Doe',
        email: 'jane@domain.com',
        role: 'user',
        isVerified: true,
        status: 'active',
      };
      const query: any = Promise.resolve(userDoc);
      query.exec = jest.fn().mockResolvedValue(userDoc);
      return query;
    });

    // Mock ActiveSession query check inside middleware
    (ActiveSession.findOne as jest.Mock).mockImplementation(() => {
      const sessionDoc = {
        userId: 'mocked_user_id',
        deviceId: 'mock_device_fingerprint_id',
        tokenFamily: 'mock_token_family',
        save: jest.fn().mockResolvedValue(true),
      };
      const query: any = Promise.resolve(sessionDoc);
      query.exec = jest.fn().mockResolvedValue(sessionDoc);
      return query;
    });
  });

  describe('GET /api/v1/payments/plans', () => {
    it('should retrieve all available subscription plan details', async () => {
      const response = await request(app).get('/api/v1/payments/plans');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.plans.length).toBe(4);
      expect(response.body.plans[0].name).toBe('mobile');
      expect(response.body.plans[3].name).toBe('premium');
    });
  });

  describe('POST /api/v1/payments/coupon/validate', () => {
    it('should return error if promo code is invalid', async () => {
      // Mock Coupon.findOne returning null via thenable
      (Coupon.findOne as jest.Mock).mockImplementation(() => {
        const query: any = Promise.resolve(null);
        query.exec = jest.fn().mockResolvedValue(null);
        return query;
      });

      const response = await request(app)
        .post('/api/v1/payments/coupon/validate')
        .set('Authorization', `Bearer ${mockToken}`)
        .set('x-device-id', 'mock_device_fingerprint_id')
        .send({
          couponCode: 'INVALIDCODE',
          planName: 'standard',
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Promo code is invalid');
    });

    it('should successfully apply valid discount coupon', async () => {
      // Mock valid coupon document
      const couponDoc = {
        code: 'AG50',
        discountPercentage: 50,
        active: true,
        expiresAt: null,
        maxRedemptions: null,
        redemptionsCount: 0,
      };

      (Coupon.findOne as jest.Mock).mockImplementation(() => {
        const query: any = Promise.resolve(couponDoc);
        query.exec = jest.fn().mockResolvedValue(couponDoc);
        return query;
      });

      const response = await request(app)
        .post('/api/v1/payments/coupon/validate')
        .set('Authorization', `Bearer ${mockToken}`)
        .set('x-device-id', 'mock_device_fingerprint_id')
        .send({
          couponCode: 'AG50',
          planName: 'standard',
        });

      const planPrice = PLANS.standard.priceINR;
      const expectedDiscount = Math.round((planPrice * 50) / 100);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.discountAmount).toBe(expectedDiscount);
      expect(response.body.finalPrice).toBe(planPrice - expectedDiscount);
    });
  });

  describe('POST /api/v1/payments/checkout', () => {
    it('should generate sandbox redirect url when secret key is empty', async () => {
      const response = await request(app)
        .post('/api/v1/payments/checkout')
        .set('Authorization', `Bearer ${mockToken}`)
        .set('x-device-id', 'mock_device_fingerprint_id')
        .send({
          planName: 'premium',
          gateway: 'stripe',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.url).toContain('/checkout-status?status=success');
      expect(response.body.url).toContain('planName=premium');
    });
  });

  describe('POST /api/v1/payments/sandbox/complete', () => {
    it('should fulfill mock payment and activate subscription', async () => {
      // Mock find existing sub returning null via thenable
      (Subscription.findOne as jest.Mock).mockImplementation(() => {
        const query: any = Promise.resolve(null);
        query.exec = jest.fn().mockResolvedValue(null);
        return query;
      });
      // Mock create subscription
      (Subscription.create as jest.Mock).mockResolvedValue({
        _id: 'sub_doc_id',
      });
      // Mock create payment invoice
      (Payment.create as jest.Mock).mockResolvedValue({
        _id: 'payment_doc_id',
      });

      const response = await request(app)
        .post('/api/v1/payments/sandbox/complete')
        .set('Authorization', `Bearer ${mockToken}`)
        .set('x-device-id', 'mock_device_fingerprint_id')
        .send({
          planName: 'premium',
          gateway: 'stripe',
          transactionId: 'mock_stripe_tx_123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('completed successfully');
    });
  });
});
