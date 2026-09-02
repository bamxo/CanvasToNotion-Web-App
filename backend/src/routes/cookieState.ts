// src/routes/cookieState.ts
// Mounted at /cookie-state (and /api/cookie-state) in index.ts.
// Port of backend/netlify/functions/cookie-state.ts.
import express from 'express';
import { setAuthenticated, clearAuthenticated } from '../controllers/cookieStateControllers';

const router = express.Router();

router.post('/set-authenticated', setAuthenticated);
router.post('/clear-authenticated', clearAuthenticated);

export default router;
