// src/routes/user.ts - User profile routes
import express from 'express';
import * as userController from '../controllers/userControllers';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

// User profile routes - all require authentication
router.get('/profile', verifyToken, userController.getProfile);
router.put('/profile', verifyToken, userController.updateProfile);

export default router;
