import { Router } from 'express';
import * as profileController from '../controllers/profile.controller';
import { authenticateUser } from '../middlewares/auth.middleware';

const router = Router();

// Protect all profile endpoints with user auth
router.use(authenticateUser);

router.get('/', profileController.getProfiles);
router.post('/', profileController.createProfile);
router.post('/verify-pin', profileController.verifyProfilePin);

export default router;
