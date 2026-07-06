import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validateRequest } from '../middlewares/validation.middleware';
import { authenticateUser } from '../middlewares/auth.middleware';
import { authLimiter, otpLimiter } from '../middlewares/rate-limiter.middleware';
import * as authDto from '../dto/auth.dto';

const router = Router();

// Signup Route
router.post(
  '/signup',
  validateRequest({ body: authDto.signupSchema }),
  authController.signup
);

// Verify OTP Route
router.post(
  '/verify-otp',
  authLimiter,
  validateRequest({ body: authDto.verifyOtpSchema }),
  authController.verifyOtp
);

// Login Route
router.post(
  '/login',
  authLimiter,
  validateRequest({ body: authDto.loginSchema }),
  authController.login
);

// Refresh Token Exchange Route
router.post(
  '/refresh',
  authController.refreshToken
);

// Logout Route
router.post(
  '/logout',
  authenticateUser,
  authController.logout
);

// Password Reset Request
router.post(
  '/password-reset/request',
  otpLimiter,
  validateRequest({ body: authDto.resetPasswordRequestSchema }),
  authController.requestPasswordReset
);

// Password Reset Confirm
router.post(
  '/password-reset/confirm',
  authLimiter,
  validateRequest({ body: authDto.resetPasswordConfirmSchema }),
  authController.confirmPasswordReset
);

// Retrieve Current Authenticated User Context
router.get(
  '/me',
  authenticateUser,
  authController.me
);

// Device Management Routes (Protected)
router.get(
  '/devices',
  authenticateUser,
  authController.getDevices
);

router.delete(
  '/devices/:deviceId',
  authenticateUser,
  authController.deleteDevice
);

router.delete(
  '/devices',
  authenticateUser,
  authController.deleteAllDevices
);

// Temporary Database Wipe Route (Remove after use)
router.get('/wipe-atlas-now-securely', async (req: any, res: any) => {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const collections = ['users', 'profiles', 'otps', 'subscriptions', 'sessions', 'auditlogs'];
    const results: string[] = [];
    for (const name of collections) {
      const count = await db.collection(name).countDocuments({});
      if (count > 0) {
        await db.collection(name).deleteMany({});
        results.push(`Cleared ${count} from ${name}`);
      } else {
        results.push(`${name} was already empty`);
      }
    }
    res.status(200).json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
