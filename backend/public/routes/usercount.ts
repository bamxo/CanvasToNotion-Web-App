// src/routes/usercount.ts
// Mounted at /usercount (and /api/usercount) in index.ts.
// Port of backend/netlify/functions/usercount.ts.
//
//   GET /  -> { count } total children under the RTDB `users` node.
//
// In-memory IP rate limit: 30 requests / 15 min. The Map lives at module scope
// so it persists across warm serverless invocations, exactly like the Netlify
// function.
import express, { Request, Response } from 'express';
import { admin } from '../config/firebaseAdmin';

const router = express.Router();

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const max = 30;
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (record.count >= max) {
    return false;
  }
  record.count++;
  return true;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const fromForwarded =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : Array.isArray(forwarded)
      ? forwarded[0]
      : undefined;
  return fromForwarded || req.ip || 'unknown';
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const ip = getClientIp(req);

  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: 'Too many requests, please try again later.' });
    return;
  }

  try {
    const snapshot = await admin.database().ref('users').once('value');
    res.json({ count: snapshot.numChildren() });
  } catch (error) {
    console.error('Error fetching user count:', error);
    res.status(500).json({ error: 'Failed to fetch user count' });
  }
});

export default router;
