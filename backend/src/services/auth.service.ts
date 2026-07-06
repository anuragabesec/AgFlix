import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/environment';
import { logger } from '../utils/logger';
import { UserRepository } from '../repositories/user.repository';
import { SessionRepository } from '../repositories/session.repository';
import { MailService } from './mail.service';
import { Otp } from '../models/otp.model';
import { User, IUser } from '../models/user.model';
import { ActiveSession } from '../models/session.model';
import { AuditLog } from '../models/audit-log.model';
import { Profile } from '../models/profile.model';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from '../errors/app-error';

export class AuthService {
  private readonly userRepository: UserRepository;
  private readonly sessionRepository: SessionRepository;
  private readonly mailService: MailService;

  constructor() {
    this.userRepository = new UserRepository();
    this.sessionRepository = new SessionRepository();
    this.mailService = new MailService();
  }

  public async signup(data: any, ip: string, userAgent?: string): Promise<{ message: string }> {
    const { name, email, password } = data;
    
    // 1. Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('Email address is already registered');
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Create unverified user
    const newUser = await this.userRepository.create({
      name,
      email,
      passwordHash,
      role: 'user',
      isVerified: false,
    });

    // 4. Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpSalt = await bcrypt.genSalt(6);
    const otpHash = await bcrypt.hash(otpCode, otpSalt);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Save to Database
    await Otp.create({
      email: email.toLowerCase(),
      otpHash,
      purpose: 'signup',
      expiresAt,
      attempts: 0,
    });

    // 5. Send OTP via Email
    await this.mailService.sendOtpEmail(email, otpCode, 'signup');

    // 6. Log Audit Event
    await AuditLog.create({
      userId: newUser._id,
      email: email.toLowerCase(),
      eventType: 'USER_SIGNUP_REQUESTED',
      severity: 'info',
      ipAddress: ip,
      userAgent,
      description: `Signup request received. OTP sent.`,
    });

    return { message: 'Signup successful. Verification OTP sent to your email.' };
  }

  public async verifyOtp(data: any, ip: string, userAgent?: string): Promise<{ user: any; accessToken: string; refreshToken: string }> {
    const { email, otpCode, purpose, deviceId, browser, os } = data;

    // 1. Find the user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User account not found');
    }

    // 2. Find the OTP record
    const otp = await Otp.findOne({ email: email.toLowerCase(), purpose });
    if (!otp) {
      throw new BadRequestError('OTP code has expired or was not requested');
    }

    // Check expiry
    if (new Date() > otp.expiresAt) {
      await otp.deleteOne();
      throw new BadRequestError('OTP code has expired. Please request a new one.');
    }

    // 3. Match OTP hash
    const isMatch = await bcrypt.compare(otpCode, otp.otpHash);
    if (!isMatch) {
      otp.attempts += 1;
      await otp.save();
      
      if (otp.attempts >= 5) {
        await otp.deleteOne();
        throw new BadRequestError('Maximum verification attempts exceeded. Code invalidated.');
      }
      
      throw new BadRequestError(`Invalid verification code. ${5 - otp.attempts} attempts remaining.`);
    }

    // OTP Verified! Delete OTP document
    await otp.deleteOne();

    // 4. Update user verification status if signup
    if (purpose === 'signup') {
      user.isVerified = true;
      await user.save();

      // Create default primary profile
      await Profile.create({
        userId: user._id,
        name: user.name.split(' ')[0],
        avatar: 'avatar_default_purple.png',
        isKids: false,
      });
    }

    // 5. Generate Access & Refresh tokens
    const tokenFamily = crypto.randomBytes(32).toString('hex');
    const { accessToken, refreshToken } = this.generateTokens(user, tokenFamily);

    // 6. Create active device session
    const location = 'Local Test Location'; // Mock geo location
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Revoke previous sessions on this device for the user if exists
    await this.sessionRepository.revokeSessionByDevice(user._id.toString(), deviceId);

    const session = await this.sessionRepository.create({
      userId: user._id,
      tokenFamily,
      refreshTokenHash,
      deviceId,
      browser,
      os,
      ipAddress: ip,
      location,
      lastActiveAt: new Date(),
    });

    // 7. Audit log
    await AuditLog.create({
      userId: user._id,
      email: user.email,
      eventType: 'USER_OTP_VERIFIED',
      severity: 'info',
      ipAddress: ip,
      userAgent,
      description: `OTP successfully verified for ${purpose}. Session started.`,
    });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
      accessToken,
      refreshToken,
    };
  }

  public async login(data: any, ip: string, userAgent?: string): Promise<{ user: any; accessToken: string; refreshToken: string }> {
    const { email, password, deviceId, browser, os } = data;

    // 1. Find user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 2. Check if user account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
      throw new ForbiddenError(`This account is locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`);
    }

    // 3. Verify Password
    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch) {
      // Increment failed login count
      const updatedUser = await this.userRepository.incrementFailedLoginAttempts(user);
      
      await AuditLog.create({
        userId: user._id,
        email: user.email,
        eventType: 'LOGIN_FAILURE',
        severity: 'warn',
        ipAddress: ip,
        userAgent,
        description: `Failed login attempt. Attempts count: ${updatedUser.failedLoginAttempts}`,
      });

      if (updatedUser.failedLoginAttempts >= 5) {
        throw new ForbiddenError('This account has been locked for 30 minutes due to 5 consecutive failed login attempts.');
      }

      throw new UnauthorizedError('Invalid email or password');
    }

    // Reset failed attempts on success
    await this.userRepository.resetFailedAttempts(user);

    // 4. Ensure email is verified
    if (!user.isVerified) {
      // Trigger new OTP for registration
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpSalt = await bcrypt.genSalt(6);
      const otpHash = await bcrypt.hash(otpCode, otpSalt);
      
      await Otp.deleteMany({ email: user.email, purpose: 'signup' });
      await Otp.create({
        email: user.email,
        otpHash,
        purpose: 'signup',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        attempts: 0,
      });
      await this.mailService.sendOtpEmail(user.email, otpCode, 'signup');

      throw new ForbiddenError('Your email is not verified. A verification code has been sent.');
    }

    // 5. Generate access & refresh tokens
    const tokenFamily = crypto.randomBytes(32).toString('hex');
    const { accessToken, refreshToken } = this.generateTokens(user, tokenFamily);

    // 6. Check if this is a login from a new device (not in session database)
    const existingSession = await this.sessionRepository.findSessionByDevice(user._id.toString(), deviceId);
    const location = 'Local Test Location';

    if (!existingSession) {
      // Email Notification
      await this.mailService.sendNewDeviceNotification(
        user.email,
        ip,
        browser || 'Unknown Browser',
        os || 'Unknown OS',
        location
      );
    } else {
      // Revoke older session on this device
      await existingSession.deleteOne();
    }

    // Save current session
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.sessionRepository.create({
      userId: user._id,
      tokenFamily,
      refreshTokenHash,
      deviceId,
      browser,
      os,
      ipAddress: ip,
      location,
      lastActiveAt: new Date(),
    });

    // 7. Audit log
    await AuditLog.create({
      userId: user._id,
      email: user.email,
      eventType: 'LOGIN_SUCCESS',
      severity: 'info',
      ipAddress: ip,
      userAgent,
      description: `Successful login session created.`,
    });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
      accessToken,
      refreshToken,
    };
  }

  public async refreshTokenExchange(
    refreshToken: string,
    deviceId: string,
    ip: string,
    userAgent?: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedError('Session expired. Please log in again.');
    }

    // 1. Hash refresh token to match database
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // 2. Find active session
    const session = await this.sessionRepository.findByRefreshTokenHash(tokenHash);

    if (!session) {
      // CRITICAL BREACH CASE: Token might be reused / stolen!
      // Revoke all sessions in the same token family
      let decodedToken: any;
      try {
        decodedToken = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
        if (decodedToken && decodedToken.tokenFamily) {
          const sessionsToRevoke = await ActiveSession.find({ tokenFamily: decodedToken.tokenFamily });
          if (sessionsToRevoke.length > 0) {
            const userId = sessionsToRevoke[0].userId;
            await ActiveSession.deleteMany({ userId });
            
            logger.warn(`[REPLAY ATTACK BREACH] Token reuse detected! Revoking all sessions for User: ${userId}`);
            await AuditLog.create({
              userId,
              eventType: 'REFRESH_TOKEN_BREACH_ATTEMPT',
              severity: 'critical',
              ipAddress: ip,
              userAgent,
              description: `Critical: Refresh Token reuse detected. Revoking all device sessions.`,
            });
          }
        }
      } catch (err) {
        // Invalid token signature, do nothing
      }
      
      throw new ForbiddenError('Invalid session status. Please log in again.');
    }

    // Verify refresh token signature & expiration
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    } catch (err) {
      await session.deleteOne();
      throw new UnauthorizedError('Session has expired. Please log in again.');
    }

    // 3. User Lookup
    const user = await this.userRepository.findById(session.userId.toString());
    if (!user || user.status === 'banned') {
      await session.deleteOne();
      throw new ForbiddenError('Authenticated session user is suspended or deleted');
    }

    // 4. Check device ID consistency
    if (session.deviceId !== deviceId) {
      await session.deleteOne();
      throw new UnauthorizedError('Device mismatch. Please log in again.');
    }

    // 5. Rotate refresh token (generate new tokens)
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = this.generateTokens(user, session.tokenFamily);

    // Save rotated session
    session.refreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    session.lastActiveAt = new Date();
    await session.save();

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  public async logout(userId: string, deviceId: string): Promise<void> {
    await this.sessionRepository.revokeSessionByDevice(userId, deviceId);
  }

  public async requestPasswordReset(email: string, ip: string, userAgent?: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    
    // Safety check: Don't let users scan registered emails. Return success either way
    if (!user) {
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    // Delete existing reset OTPs
    await Otp.deleteMany({ email: email.toLowerCase(), purpose: 'password_reset' });

    // Generate 6-digit Reset OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpSalt = await bcrypt.genSalt(6);
    const otpHash = await bcrypt.hash(otpCode, otpSalt);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await Otp.create({
      email: email.toLowerCase(),
      otpHash,
      purpose: 'password_reset',
      expiresAt,
      attempts: 0,
    });

    await this.mailService.sendOtpEmail(email, otpCode, 'password_reset');

    await AuditLog.create({
      userId: user._id,
      email: user.email,
      eventType: 'PASSWORD_RESET_REQUESTED',
      severity: 'info',
      ipAddress: ip,
      userAgent,
      description: `Password reset OTP dispatched.`,
    });
  }

  public async confirmPasswordReset(data: any, ip: string, userAgent?: string): Promise<void> {
    const { email, otpCode, password } = data;

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User account not found');
    }

    const otp = await Otp.findOne({ email: email.toLowerCase(), purpose: 'password_reset' });
    if (!otp) {
      throw new BadRequestError('Password reset code expired or invalid');
    }

    if (new Date() > otp.expiresAt) {
      await otp.deleteOne();
      throw new BadRequestError('Reset code expired. Please request a new one.');
    }

    const isMatch = await bcrypt.compare(otpCode, otp.otpHash);
    if (!isMatch) {
      otp.attempts += 1;
      await otp.save();
      
      if (otp.attempts >= 5) {
        await otp.deleteOne();
        throw new BadRequestError('Maximum reset verification attempts exceeded.');
      }
      
      throw new BadRequestError(`Invalid verification code. ${5 - otp.attempts} attempts remaining.`);
    }

    // Verified!
    await otp.deleteOne();

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(password, salt);
    
    // Revoke all existing login sessions for security on password change
    await this.sessionRepository.revokeAllUserSessions(user._id.toString());
    await user.save();

    await AuditLog.create({
      userId: user._id,
      email: user.email,
      eventType: 'PASSWORD_RESET_COMPLETED',
      severity: 'info',
      ipAddress: ip,
      userAgent,
      description: `Password reset verified. All active sessions invalidated.`,
    });
  }

  // Token helper
  private generateTokens(user: IUser, tokenFamily: string): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, tokenFamily },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY as any }
    );

    const refreshToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, tokenFamily },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRY as any }
    );

    return { accessToken, refreshToken };
  }
}
export default AuthService;
