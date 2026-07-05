import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthService } from '../services/auth.service';
import { env } from '../config/environment';
import { ActiveSession } from '../models/session.model';

const authService = new AuthService();

const getCookieOptions = (maxAgeMs: number) => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: maxAgeMs,
});

export const signup: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.signup(req.body, req.ip || '', req.headers['user-agent'] as string);
    res.status(201).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.verifyOtp(req.body, req.ip || '', req.headers['user-agent'] as string);

    // Set secure HTTP-only cookies
    res.cookie('accessToken', result.accessToken, getCookieOptions(15 * 60 * 1000)); // 15m
    res.cookie('refreshToken', result.refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000)); // 7d

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.login(req.body, req.ip || '', req.headers['user-agent'] as string);

    // Set secure HTTP-only cookies
    res.cookie('accessToken', result.accessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie('refreshToken', result.refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token = req.cookies.refreshToken || req.body.refreshToken;
    const deviceId = req.headers['x-device-id'] as string || req.cookies.deviceId;

    const result = await authService.refreshTokenExchange(
      token,
      deviceId,
      req.ip || '',
      req.headers['user-agent'] as string
    );

    res.cookie('accessToken', result.accessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie('refreshToken', result.refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.status(200).json({
      success: true,
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const logout: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deviceId = req.headers['x-device-id'] as string || req.cookies.deviceId;
    
    if (req.user && deviceId) {
      await authService.logout(req.user.id, deviceId);
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const requestPasswordReset: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await authService.requestPasswordReset(req.body.email, req.ip || '', req.headers['user-agent'] as string);
    res.status(200).json({
      success: true,
      message: 'If the email matches a registered account, a reset OTP code was sent.',
    });
  } catch (error) {
    next(error);
  }
};

export const confirmPasswordReset: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await authService.confirmPasswordReset(req.body, req.ip || '', req.headers['user-agent'] as string);
    res.status(200).json({
      success: true,
      message: 'Password reset successful. You may now log in with your new credentials.',
    });
  } catch (error) {
    next(error);
  }
};

export const me: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    user: req.user ? {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isVerified: req.user.isVerified,
    } : null,
  });
};

export const getDevices: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!._id;
    const sessions = await ActiveSession.find({ userId });
    res.status(200).json({
      success: true,
      devices: sessions.map((s) => ({
        deviceId: s.deviceId,
        browser: s.browser,
        os: s.os,
        ipAddress: s.ipAddress,
        location: s.location,
        isStreaming: s.isStreaming,
        lastActiveAt: s.lastActiveAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDevice: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { deviceId } = req.params;
    await ActiveSession.deleteOne({ userId, deviceId });
    res.status(200).json({
      success: true,
      message: 'Device session revoked successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAllDevices: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!._id;
    const currentDeviceId = req.headers['x-device-id'] as string || req.cookies.deviceId;
    
    // Revoke all sessions except the current device
    await ActiveSession.deleteMany({ userId, deviceId: { $ne: currentDeviceId } });
    
    res.status(200).json({
      success: true,
      message: 'All other device sessions terminated successfully.',
    });
  } catch (error) {
    next(error);
  }
};
