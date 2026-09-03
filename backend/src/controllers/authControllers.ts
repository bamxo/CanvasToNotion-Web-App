// src/controllers/authController.ts - Authentication handlers
//
// Ported to match the behaviour of backend/netlify/functions/auth.ts (the
// behavioural source of truth) so the Vercel Express deployment behaves
// identically to the retired Netlify functions.
import { Request, Response } from 'express';
import axios from 'axios';
import firebaseConfig from '../config/firebase';
import { admin } from '../config/firebase-admin';
import {
  SignupRequest,
  LoginRequest,
  PasswordResetRequest,
  GoogleAuthRequest,
  AuthResponse,
  AuthenticatedRequest,
  DEFAULT_NEW_USER_TIER
} from '../types';
import { OAuth2Client } from 'google-auth-library';
import { sendPasswordResetEmail } from '../utils/passwordResetEmail';

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ---------------------------------------------------------------------------
// Cookie helpers
//
// Matches the Netlify `setSessionCookie` / cookie-clear helpers: the cookie is
// named `authToken` and its value is the Firebase ID token. Production uses the
// cross-domain attribute set; development drops Domain/Secure and uses Lax.
// ---------------------------------------------------------------------------
const authCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return isProd
    ? {
        httpOnly: true,
        secure: true,
        sameSite: 'none' as const,
        domain: '.canvastonotion.io',
        path: '/'
      }
    : {
        httpOnly: true,
        secure: false,
        sameSite: 'lax' as const,
        path: '/'
      };
};

export const setAuthCookie = (res: Response, idToken: string): void => {
  res.cookie('authToken', idToken, authCookieOptions());
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie('authToken', authCookieOptions());
};

// ---------------------------------------------------------------------------
// signup
// ---------------------------------------------------------------------------
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, displayName }: SignupRequest = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const resolvedDisplayName = displayName || email.split('@')[0];

    // 1. Create user in Firebase Auth using the Admin SDK
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: resolvedDisplayName
    });

    // 2. Get an ID token via the Firebase Auth REST API
    const authResponse = await axios.post<AuthResponse>(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
      { email, password, returnSecureToken: true }
    );

    // 3. Save the user profile to the Realtime Database
    try {
      const userData = {
        email,
        displayName: resolvedDisplayName,
        createdAt: new Date().toISOString(),
        tier: DEFAULT_NEW_USER_TIER
      };

      await admin.database().ref(`users/${userRecord.uid}`).set(userData);

      setAuthCookie(res, authResponse.data.idToken);

      res.status(201).json({
        idToken: authResponse.data.idToken,
        email: authResponse.data.email,
        refreshToken: authResponse.data.refreshToken,
        expiresIn: authResponse.data.expiresIn,
        localId: userRecord.uid,
        displayName: userData.displayName
      });
    } catch (dbError) {
      // Auth succeeded but the DB write failed - still a 201, with a warning.
      setAuthCookie(res, authResponse.data.idToken);

      res.status(201).json({
        idToken: authResponse.data.idToken,
        email: authResponse.data.email,
        refreshToken: authResponse.data.refreshToken,
        expiresIn: authResponse.data.expiresIn,
        localId: userRecord.uid,
        warning: 'User created but profile data not saved'
      });
    }
  } catch (error) {
    let statusCode = 400;
    let errorMessage = 'Failed to create user';

    if (axios.isAxiosError(error) && error.response) {
      statusCode = error.response.status;
      errorMessage = error.response.data?.error?.message || 'Failed to create user';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    res.status(statusCode).json({ error: errorMessage });
  }
};

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, requestExtensionToken }: LoginRequest = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const response = await axios.post<AuthResponse>(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
      { email, password, returnSecureToken: true }
    );

    const authData = response.data;

    setAuthCookie(res, authData.idToken);

    if (requestExtensionToken) {
      const customToken = await admin.auth().createCustomToken(authData.localId);
      res.status(200).json({
        idToken: authData.idToken,
        refreshToken: authData.refreshToken,
        expiresIn: authData.expiresIn,
        localId: authData.localId,
        email: authData.email,
        extensionToken: customToken
      });
    } else {
      res.status(200).json(authData);
    }
  } catch (error) {
    let statusCode = 400;
    let errorMessage = 'Authentication failed';

    if (axios.isAxiosError(error) && error.response) {
      statusCode = error.response.status;
      errorMessage = error.response.data?.error?.message || 'Authentication failed';
    }

    res.status(statusCode).json({ error: errorMessage });
  }
};

// ---------------------------------------------------------------------------
// forgotPassword
//
// Generates a reset link with the Admin SDK (which sends nothing), pulls the
// oobCode out of it, and mails our OWN /reset-password app URL via a branded
// template. The user never touches Firebase's hosted action page.
// ---------------------------------------------------------------------------
const appBaseUrl = (): string =>
  (
    process.env.APP_BASE_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://canvastonotion.io'
      : 'http://localhost:5173')
  ).replace(/\/+$/, '');

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email }: PasswordResetRequest = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    let resetLink: string;
    try {
      resetLink = await admin.auth().generatePasswordResetLink(email);
    } catch (err) {
      // Don't reveal whether the account exists - always report success.
      const code = (err as { code?: string })?.code;
      if (code === 'auth/user-not-found' || code === 'auth/email-not-found') {
        res.status(200).json({ message: 'Password reset email sent' });
        return;
      }
      console.error('[forgotPassword] generatePasswordResetLink failed:', err);
      throw err;
    }

    const oobCode = new URL(resetLink).searchParams.get('oobCode');
    if (!oobCode) {
      console.error('[forgotPassword] no oobCode in generated link:', resetLink);
      res.status(500).json({ error: 'Failed to send password reset email' });
      return;
    }

    const resetUrl = `${appBaseUrl()}/reset-password?oobCode=${oobCode}`;

    try {
      await sendPasswordResetEmail(email, resetUrl);
    } catch (mailErr) {
      console.error('[forgotPassword] sendPasswordResetEmail failed:', mailErr);
      throw mailErr;
    }

    res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send password reset email' });
  }
};

// ---------------------------------------------------------------------------
// resetPassword - confirm a reset with the oobCode + a new password
// ---------------------------------------------------------------------------
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { oobCode, newPassword } = req.body as { oobCode?: string; newPassword?: string };

    if (!oobCode || !newPassword) {
      res.status(400).json({ error: 'Reset code and new password are required' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long' });
      return;
    }

    await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${firebaseConfig.apiKey}`,
      { oobCode, newPassword }
    );

    res.status(200).json({ message: 'Password has been reset' });
  } catch (error) {
    let statusCode = 500;
    let errorMessage = 'Failed to reset password';

    if (axios.isAxiosError(error) && error.response) {
      const code = error.response.data?.error?.message || '';
      if (code === 'EXPIRED_OOB_CODE' || code === 'INVALID_OOB_CODE') {
        statusCode = 400;
        errorMessage = code;
      } else {
        statusCode = error.response.status || 500;
        errorMessage = code || errorMessage;
      }
    }

    res.status(statusCode).json({ error: errorMessage });
  }
};

// ---------------------------------------------------------------------------
// getUser - GET /auth/user
//
// Ported from Netlify `handleGetUser`. Does its own bearer-token check (no
// verifyToken middleware) and verifies the token via the identitytoolkit
// accounts:lookup REST endpoint.
// ---------------------------------------------------------------------------
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header is required' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];

    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
      { idToken }
    );

    if (response.data && response.data.users && response.data.users.length > 0) {
      const user = response.data.users[0];
      res.status(200).json({
        email: user.email,
        firstName: user.displayName ? user.displayName.split(' ')[0] : undefined,
        displayName: user.displayName,
        photoURL: user.photoUrl
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    let errorMessage = 'Invalid token';

    if (axios.isAxiosError(error) && error.response) {
      errorMessage = error.response.data?.error?.message || 'Invalid token';
    }

    res.status(401).json({ error: errorMessage });
  }
};

// ---------------------------------------------------------------------------
// googleAuth
// ---------------------------------------------------------------------------
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken, requestExtensionToken }: GoogleAuthRequest = req.body;

    if (!idToken) {
      res.status(400).json({ error: 'Google ID token is required' });
      return;
    }

    // 1. Verify the Google ID token (with a REST tokeninfo fallback).
    let payload: any;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'verification failed';
      try {
        const tokenInfoResponse = await axios.get(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
        );

        if (tokenInfoResponse.status === 200 && tokenInfoResponse.data.email) {
          payload = tokenInfoResponse.data;
        } else {
          res.status(401).json({
            error: 'Invalid Google ID token',
            details: errMessage,
            alternativeValidation: 'failed'
          });
          return;
        }
      } catch (altErr) {
        res.status(401).json({
          error: 'Invalid Google ID token',
          details: errMessage,
          alternativeError: altErr instanceof Error ? altErr.message : undefined
        });
        return;
      }
    }

    if (!payload || !payload.email) {
      res.status(400).json({ error: 'Invalid Google token payload' });
      return;
    }

    // 2. Get or create the Firebase user, linking the google.com provider.
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(payload.email);

      const hasGoogleProvider = userRecord.providerData.some(
        (provider) => provider.providerId === 'google.com'
      );

      if (!hasGoogleProvider) {
        await admin.auth().updateUser(userRecord.uid, {
          providerToLink: {
            providerId: 'google.com',
            uid: payload.sub,
            email: payload.email,
            displayName: payload.name,
            photoURL: payload.picture
          }
        });
      }
    } catch (e) {
      userRecord = await admin.auth().createUser({
        email: payload.email,
        displayName: payload.name,
        photoURL: payload.picture,
        emailVerified: payload.email_verified
      });

      await admin.auth().updateUser(userRecord.uid, {
        providerToLink: {
          providerId: 'google.com',
          uid: payload.sub,
          email: payload.email,
          displayName: payload.name,
          photoURL: payload.picture
        }
      });

      try {
        await admin.database().ref(`/users/${userRecord.uid}`).set({
          email: payload.email,
          displayName: payload.name || payload.email.split('@')[0],
          photoURL: payload.picture,
          provider: 'google.com',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          tier: DEFAULT_NEW_USER_TIER
        });
      } catch (dbError) {
        // Continue even if the profile write fails.
      }
    }

    // 3. Create a Firebase custom token (used by the extension).
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    // 4. Exchange the Google ID token for a Firebase ID token.
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${firebaseConfig.apiKey}`,
      {
        postBody: `id_token=${idToken}&providerId=google.com`,
        requestUri: 'http://localhost',
        returnSecureToken: true
      }
    );

    setAuthCookie(res, response.data.idToken);

    res.status(200).json({
      idToken: response.data.idToken,
      customToken,
      ...(requestExtensionToken ? { extensionToken: customToken } : {}),
      email: payload.email,
      photoURL: payload.picture
    });
  } catch (error) {
    res.status(500).json({ error: 'Google authentication failed' });
  }
};

// ---------------------------------------------------------------------------
// deleteAccount
// ---------------------------------------------------------------------------
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      res.status(400).json({ error: 'ID token is required' });
      return;
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    try {
      await admin.database().ref(`/users/${uid}`).remove();
    } catch (dbError) {
      // Continue with auth deletion even if the DB removal fails.
    }

    await admin.auth().deleteUser(uid);

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

// ---------------------------------------------------------------------------
// refreshExtensionToken - runs behind the verifyToken middleware
// ---------------------------------------------------------------------------
export const refreshExtensionToken = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const extensionToken = await admin.auth().createCustomToken(uid);

    res.status(200).json({ success: true, extensionToken });
  } catch (error) {
    console.error('Failed to refresh extension token:', error);
    res.status(500).json({ error: 'Failed to refresh extension token' });
  }
};

// ---------------------------------------------------------------------------
// logout - clear the authToken cookie
// ---------------------------------------------------------------------------
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    clearAuthCookie(res);
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to logout' });
  }
};
