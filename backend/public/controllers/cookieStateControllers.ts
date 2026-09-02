// src/controllers/cookieStateControllers.ts
// Ported from backend/netlify/functions/cookie-state.ts
//
// Sets / clears the `isAuthenticated` cookie the frontend reads to know whether
// a session exists. The cookie is intentionally NOT httpOnly (the SPA reads it).
//
// Prod attributes: Path=/; Secure; SameSite=None; Domain=.canvastonotion.io
// Dev  attributes: Path=/; SameSite=Lax  (no Domain, not Secure) so it works on
// http://localhost.
//
// CORS / OPTIONS are handled globally in index.ts - not re-added here.
import { Request, Response, CookieOptions } from 'express';
import { admin } from '../config/firebaseAdmin';

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

// Shared attribute set for both res.cookie and res.clearCookie so the browser
// matches the cookie for deletion.
const authCookieOptions = (): CookieOptions => {
  if (isProduction()) {
    return {
      path: '/',
      secure: true,
      sameSite: 'none',
      domain: '.canvastonotion.io',
    };
  }
  return {
    path: '/',
    secure: false,
    sameSite: 'lax',
  };
};

// Verify a Firebase ID token from the Authorization: Bearer header, matching the
// Netlify function's local bearer check (no cookie fallback here).
const verifyBearer = async (
  authHeader: string | undefined
): Promise<{ uid: string } | null> => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return { uid: decoded.uid };
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
};

export const setAuthenticated = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await verifyBearer(req.headers.authorization);

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    res.cookie('isAuthenticated', 'true', authCookieOptions());
    res.status(200).json({ success: true, message: 'Authentication cookie set' });
  } catch (error) {
    console.error('Error setting authentication cookie:', error);
    res.status(500).json({ error: 'Failed to set authentication cookie' });
  }
};

// Matches Netlify: clearing the cookie does NOT require authentication.
export const clearAuthenticated = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.clearCookie('isAuthenticated', authCookieOptions());
    res.status(200).json({ success: true, message: 'Authentication cookie cleared' });
  } catch (error) {
    console.error('Error clearing authentication cookie:', error);
    res.status(500).json({ error: 'Failed to clear authentication cookie' });
  }
};
