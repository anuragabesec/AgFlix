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

export default router;
