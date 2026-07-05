import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { UnauthorizedError, ForbiddenError } from '../errors/app-error';
import { User, IUser } from '../models/user.model';
import { ActiveSession } from '../models/session.model';
import { Profile, IProfile } from '../models/profile.model';

// Declare global express custom typing
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      profile?: IProfile;
    }
  }
}

interface DecodedToken {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  tokenFamily: string;
}

export const authenticateUser: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | null = null;

    // 1. Try to extract token from auth header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // 2. Fallback to cookies
    if (!token && req.cookies) {
      token = req.cookies.accessToken || null;
    }

    if (!token) {
      return next(new UnauthorizedError('Access token is missing'));
    }

    // 3. Verify JWT token
    let decoded: DecodedToken;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as DecodedToken;
    } catch (err) {
      return next(new UnauthorizedError('Access token has expired or is invalid'));
    }

    // 4. Find user in database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new UnauthorizedError('Authenticated user no longer exists'));
    }

    // Check account status
    if (user.status === 'banned') {
      return next(new ForbiddenError('Your account has been suspended'));
    }

    // Ensure email is verified
    if (!user.isVerified) {
      return next(new ForbiddenError('Please verify your email address to access this resource'));
    }

    // 5. Verify device fingerprint / active session matches token family
    const deviceId = req.headers['x-device-id'] as string || req.cookies.deviceId;
    if (!deviceId) {
      return next(new UnauthorizedError('Device fingerprint identification header is missing'));
    }

    const session = await ActiveSession.findOne({
      userId: user._id,
      deviceId,
      tokenFamily: decoded.tokenFamily,
    });

    if (!session) {
      return next(new UnauthorizedError('Session expired or device mismatch. Please log in again.'));
    }

    // Update last active timestamp on session in background
    session.lastActiveAt = new Date();
    await session.save();

    // Bind user to request
    req.user = user;

    // 6. Bind profile context if provided
    const profileId = req.headers['x-profile-id'] as string || req.cookies.profileId;
    if (profileId) {
      const profile = await Profile.findOne({ _id: profileId, userId: user._id });
      if (profile) {
        req.profile = profile;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Check if user is admin
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ForbiddenError('Admin privileges are required for this action'));
  }
  next();
};
