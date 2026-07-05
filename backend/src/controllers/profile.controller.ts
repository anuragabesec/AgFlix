import { Request, Response, NextFunction, RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import { Profile } from '../models/profile.model';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../errors/app-error';

export const getProfiles: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!._id;
    const profiles = await Profile.find({ userId });
    
    res.status(200).json({
      success: true,
      profiles: profiles.map((p) => ({
        id: p._id,
        name: p.name,
        avatar: p.avatar,
        isKids: p.isKids,
        pinLocked: !!p.pinHash,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const createProfile: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { name, avatar, isKids, pin } = req.body;

    // 1. Limit to 4 profiles
    const count = await Profile.countDocuments({ userId });
    if (count >= 4) {
      throw new BadRequestError('Maximum limit of 4 profiles reached on this account');
    }

    if (!name || name.trim().length < 2) {
      throw new BadRequestError('Profile name must be at least 2 characters long');
    }

    // 2. Hash PIN if provided
    let pinHash: string | undefined = undefined;
    if (pin) {
      if (!/^\d{4}$/.test(pin)) {
        throw new BadRequestError('Profile lock PIN must be exactly 4 digits');
      }
      const salt = await bcrypt.genSalt(10);
      pinHash = await bcrypt.hash(pin, salt);
    }

    // 3. Create profile
    const profile = await Profile.create({
      userId,
      name: name.trim(),
      avatar: avatar || 'avatar_default_purple.png',
      isKids: !!isKids,
      pinHash,
    });

    res.status(201).json({
      success: true,
      message: 'Profile created successfully.',
      profile: {
        id: profile._id,
        name: profile.name,
        avatar: profile.avatar,
        isKids: profile.isKids,
        pinLocked: !!profile.pinHash,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyProfilePin: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { profileId, pin } = req.body;

    const profile = await Profile.findOne({ _id: profileId, userId });
    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    if (!profile.pinHash) {
      res.status(200).json({ success: true, message: 'Profile is not locked' });
      return;
    }

    if (!pin) {
      throw new BadRequestError('Profile lock PIN is required');
    }

    const isMatch = await bcrypt.compare(pin, profile.pinHash);
    if (!isMatch) {
      throw new UnauthorizedError('Incorrect profile lock PIN');
    }

    res.status(200).json({
      success: true,
      message: 'Profile unlocked successfully.',
    });
  } catch (error) {
    next(error);
  }
};
