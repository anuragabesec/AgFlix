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

// Secure Password-Protected Database Wipe Route (For Testing Phase)
router.get('/wipe-atlas-now-securely', async (req: any, res: any) => {
  const { secret } = req.query;
  if (secret !== 'Anurag1602') {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }
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

// Secure Password-Protected Database Seeding Route (For Seeding Movies on Atlas Cloud)
router.get('/seed-atlas-clips-now-securely', async (req: any, res: any) => {
  const { secret } = req.query;
  if (secret !== 'Anurag1602') {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const MovieModel = require('../models/movie.model').default;
    const clips = [
      {
        title: 'Dhruandar',
        description: 'A fearless man stands against injustice, fighting to protect his homeland in this high-octane action drama.',
        releaseYear: 2024,
        genres: ['Action', 'Drama'],
        ageRating: 'PG-13',
        duration: 142,
        thumbnail: 'https://agflix.onrender.com/uploads/thumbnails/dhruandar_thumbnail.png',
        poster: 'https://agflix.onrender.com/uploads/posters/dhruandar_poster.png',
        videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
        cast: ['Dhruva', 'Sanjay Dutt', 'Raveena Tandon'],
        isOriginal: false,
        isTrending: true,
        featured: false,
        active: true,
      },
      {
        title: 'Panchayat',
        description: 'An engineering graduate joins as a secretary of a Panchayat office in a remote village of Phulera due to lack of better job options.',
        releaseYear: 2020,
        genres: ['Comedy', 'Drama'],
        ageRating: 'G',
        duration: 35,
        thumbnail: 'https://agflix.onrender.com/uploads/thumbnails/panchayat_thumbnail.png',
        poster: 'https://agflix.onrender.com/uploads/posters/panchayat_poster.png',
        videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
        cast: ['Jitendra Kumar', 'Raghubir Yadav', 'Neena Gupta'],
        isOriginal: true,
        isTrending: true,
        featured: false,
        active: true,
      },
      {
        title: 'Border 2',
        description: 'A heroic military company faces overwhelming odds on the battlefield, defending their nation with utmost valor and sacrifice in this epic sequel.',
        releaseYear: 2026,
        genres: ['Action', 'Drama'],
        ageRating: 'PG-13',
        duration: 165,
        thumbnail: 'https://agflix.onrender.com/uploads/thumbnails/border2_thumbnail.png',
        poster: 'https://agflix.onrender.com/uploads/posters/border2_poster.png',
        videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
        cast: ['Sunny Deol', 'Varun Dhawan', 'Ayushmann Khurrana'],
        isOriginal: true,
        isTrending: true,
        featured: true,
        active: true,
      },
    ];

    const results: string[] = [];
    for (const clip of clips) {
      const exists = await MovieModel.findOne({ title: clip.title });
      if (exists) {
        Object.assign(exists, clip);
        await exists.save();
        results.push(`Updated ${clip.title}`);
      } else {
        await MovieModel.create(clip);
        results.push(`Created ${clip.title}`);
      }
    }
    res.status(200).json({ success: true, message: 'Cloud database seeded successfully!', results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
