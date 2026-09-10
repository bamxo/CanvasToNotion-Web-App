// src/routes/billing.ts - Stripe billing routes
import express from 'express';
import { verifyToken } from '../middleware/auth';
import { checkout, portal, refund, reactivate, webhook } from '../billing/billingController';

const router = express.Router();

router.post('/checkout', verifyToken, checkout);
router.post('/portal', verifyToken, portal);
router.post('/refund', verifyToken, refund);
router.post('/reactivate', verifyToken, reactivate);
// Stripe calls this directly - no bearer token; authenticity is the signature.
router.post('/webhook', webhook);

export default router;
