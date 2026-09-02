// src/middleware/auth.ts - Firebase ID token verification middleware
//
// Matches the Netlify functions' behaviour: verify the Firebase ID token with
// the Admin SDK (admin.auth().verifyIdToken) rather than the identitytoolkit
// accounts:lookup REST call. The token is taken from the Authorization: Bearer
// header (as the Netlify functions do), with the `authToken` cookie kept as a
// fallback for browser requests.
import { Response, NextFunction } from 'express';
import { admin } from '../config/firebaseAdmin';
import { AuthenticatedRequest } from '../types';

export const verifyToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Authorization header wins (matches Netlify); fall back to the authToken cookie.
  const authHeader = req.headers.authorization;
  const headerToken =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split('Bearer ')[1]
      : undefined;

  const idToken = headerToken || req.cookies?.authToken;

  if (!idToken) {
    res.status(401).json({ error: 'No authentication token provided' });
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);

    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? '',
      displayName: decoded.name as string | undefined,
      photoURL: decoded.picture as string | undefined,
      emailVerified: decoded.email_verified as boolean | undefined,
    };

    next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};
