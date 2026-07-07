import express, { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as movieController from '../controllers/movie.controller';
import { authenticateUser } from '../middlewares/auth.middleware';

const router = Router();

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let destDir = path.join(__dirname, '../../uploads/temp');
    if (file.fieldname === 'video') {
      destDir = path.join(__dirname, '../../uploads/videos');
    } else if (file.fieldname === 'thumbnail') {
      destDir = path.join(__dirname, '../../uploads/thumbnails');
    } else if (file.fieldname === 'poster') {
      destDir = path.join(__dirname, '../../uploads/posters');
    }

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB file size limit for video uploads in local dev runs
  },
});

// Protect all movie routes
router.use(authenticateUser);

router.get('/', movieController.getMovies);
router.get('/trending', movieController.getTrending);
router.get('/originals', movieController.getOriginals);
router.get('/featured', movieController.getFeatured);
router.get('/continue-watching', movieController.getContinueWatching);
router.get('/my-list', movieController.getMyList);
router.get('/:id', movieController.getMovieById);
router.post('/:id/like', movieController.likeMovie);
router.post('/:id/progress', movieController.saveProgress);
router.post('/:id/watchlist', movieController.toggleWatchlist);
router.post('/:id/favorite', movieController.toggleFavorite);

// Watch Party routes
router.post('/watch-party', movieController.createWatchParty);
router.get('/watch-party/:code', movieController.getWatchPartyByCode);

// Administrative Upload Endpoint (accepts multipart fields)
router.post(
  '/',
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'poster', maxCount: 1 },
  ]),
  movieController.createMovie
);

export default router;
