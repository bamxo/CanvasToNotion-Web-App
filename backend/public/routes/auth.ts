// src/routes/auth.ts - Authentication routes
import express from 'express';
import * as authController from '../controllers/authControllers';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

// Authentication routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/google', authController.googleAuth);
router.post('/delete-account', authController.deleteAccount);
router.post('/refresh-extension-token', verifyToken, authController.refreshExtensionToken);
router.post('/logout', authController.logout);

export default router;
