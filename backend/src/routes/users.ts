// src/routes/user.ts - User profile routes
import express from 'express';
import * as userController from '../controllers/userControllers';
import { verifyToken } from '../middleware/auth';
import { getEntitlements } from '../billing/billingController';

const router = express.Router();

// User profile routes - all require authentication
router.get('/profile', verifyToken, userController.getProfile);
router.get('/info', verifyToken, userController.getUserInfo);
router.put('/profile', verifyToken, userController.updateProfile);
router.get('/entitlements', verifyToken, getEntitlements);

export default router;
