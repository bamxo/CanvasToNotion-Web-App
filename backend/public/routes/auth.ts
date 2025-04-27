// src/routes/auth.ts - Authentication routes
import express from 'express';
import * as authController from '../controllers/authControllers';

const router = express.Router();

// Authentication routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/google', authController.googleAuth);

export default router;
