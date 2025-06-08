// src/controllers/authController.ts - Authentication handlers
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
  UserData,
  AuthenticatedRequest
} from '../types';
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '<your-client-id>.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, displayName }: SignupRequest = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    
    // 1. Create auth account
    const authResponse = await axios.post<AuthResponse>(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
      { email, password, displayName, returnSecureToken: true }
    );
    
    // 2. Save user data to database
    try {
      if (authResponse.data?.localId) {
        const databaseUrl = `${firebaseConfig.databaseURL}/users/${authResponse.data.localId}.json`;
        
        await axios.put(
          `${databaseUrl}?auth=${authResponse.data.idToken}`,
          {
            email,
            displayName: displayName || email.split('@')[0],
            createdAt: new Date().toISOString()
          }
        );
      }
      
      res.status(201).json(authResponse.data);
    } catch (dbError) {
      res.status(201).json({
        ...authResponse.data,
        warning: 'User created but profile data not saved'
      });
    }
  } catch (error) {
    const errorMessage = axios.isAxiosError(error) ? 
      error.response?.data?.error?.message || 'Authentication failed' : 
      'Authentication failed';
    res.status(axios.isAxiosError(error) ? error.response?.status || 500 : 500)
      .json({ error: errorMessage });
  }
};

// Add to your authController.ts
export const testDatabase = async (req: Request, res: Response): Promise<void> => {
  try {
    const testData = {
      test: new Date().toISOString(),
      message: "Test write to Firebase Realtime Database"
    };
    
    const response = await axios.put(
      `${firebaseConfig.databaseURL}/test.json`,
      testData
    );
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Database test error:', error);
    
    // Type-safe error handling
    let errorDetails: any;
    if (axios.isAxiosError(error)) {
      errorDetails = error.response?.data;
    } else if (error instanceof Error) {
      errorDetails = error.message;
    } else {
      errorDetails = 'Unknown error occurred';
    }
    
    res.status(500).json({
      error: 'Failed to write to database',
      details: errorDetails
    });
  }
};


// User login with email/password
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, requestExtensionToken }: LoginRequest = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    
    // Authenticate with Firebase
    const response = await axios.post<AuthResponse>(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
      {
        email,
        password,
        returnSecureToken: true
      }
    );

    const authData = response.data;
    
    // If client requests a token for extension
    if (requestExtensionToken) {
      const customToken = await admin.auth().createCustomToken(authData.localId);
      res.json({
        ...authData,
        extensionToken: customToken
      });
    } else {
      res.json(authData);
    }
  } catch (error) {
    const errorMessage = axios.isAxiosError(error) ? 
      error.response?.data?.error?.message || 'Authentication failed' : 
      'Authentication failed';
    res.status(axios.isAxiosError(error) ? error.response?.status || 500 : 500)
      .json({ error: errorMessage });
  }
};

// Send password reset email
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email }: PasswordResetRequest = req.body;
    
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }
    
    await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`,
      {
        requestType: 'PASSWORD_RESET',
        email
      }
    );
    
    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    const errorMessage = axios.isAxiosError(error) ? 
      error.response?.data?.error?.message || 'Failed to send password reset email' : 
      'Failed to send password reset email';
    res.status(axios.isAxiosError(error) ? error.response?.status || 500 : 500)
      .json({ error: errorMessage });
  }
};

// Sign in with Google ID token (after frontend Google authentication)
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken, requestExtensionToken }: GoogleAuthRequest = req.body;
    if (!idToken) {
      res.status(400).json({ error: 'Google ID token is required' });
      return;
    }

    // 1. Verify Google ID token
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      res.status(401).json({ error: 'Invalid Google ID token' });
      return;
    }
    if (!payload || !payload.email) {
      res.status(400).json({ error: 'Invalid Google token payload' });
      return;
    }

    // 2. Get or create Firebase user
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(payload.email);
      
      // If user exists but doesn't have Google provider, link it
      const userProviders = await admin.auth().getUserByEmail(payload.email);
      const hasGoogleProvider = userProviders.providerData.some(
        provider => provider.providerId === 'google.com'
      );

      if (!hasGoogleProvider) {
        await admin.auth().updateUser(userRecord.uid, {
          providerToLink: {
            providerId: 'google.com',
            uid: payload.sub,
            email: payload.email,
            displayName: payload.name,
            photoURL: payload.picture,
          }
        });
      }
    } catch (e) {
      // Create new user with Google provider info
      userRecord = await admin.auth().createUser({
        email: payload.email,
        displayName: payload.name,
        photoURL: payload.picture,
        emailVerified: payload.email_verified,
      });

      // Link Google provider
      await admin.auth().updateUser(userRecord.uid, {
        providerToLink: {
          providerId: 'google.com',
          uid: payload.sub,
          email: payload.email,
          displayName: payload.name,
          photoURL: payload.picture,
        }
      });

      // Create user profile in database using admin SDK
      try {
        await admin.database().ref(`/users/${userRecord.uid}`).set({
          email: payload.email,
          displayName: payload.name || payload.email.split('@')[0],
          photoURL: payload.picture,
          provider: 'google.com',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        });
      } catch (dbError) {
        // Continue even if database save fails
      }
    }

    // 3. Create Firebase custom token for extension
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    // 4. Exchange Google ID token for Firebase ID token
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${firebaseConfig.apiKey}`,
      {
        postBody: `id_token=${idToken}&providerId=google.com`,
        requestUri: 'http://localhost',
        returnSecureToken: true
      }
    );

    res.json({
      idToken: response.data.idToken,
      customToken,
      ...(requestExtensionToken ? { extensionToken: customToken } : {}),
      email: payload.email,
      photoURL: payload.picture,
    });
  } catch (error) {
    res.status(500).json({ error: 'Google authentication failed' });
  }
};

// Delete user account
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      res.status(400).json({ error: 'ID token is required' });
      return;
    }

    // Verify the token and get user info
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Delete user data from database
    try {
      await admin.database().ref(`/users/${uid}`).remove();
    } catch (dbError) {
      // Continue with auth deletion even if database deletion fails
    }

    // Delete user from Firebase Auth
    await admin.auth().deleteUser(uid);
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

// Refresh extension token
export const refreshExtensionToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // User should already be authenticated by middleware
    const userId = req.user?.localId;
    
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    // Generate a new custom token for the extension
    const extensionToken = await admin.auth().createCustomToken(userId);
    
    // Return the new token
    res.json({
      success: true,
      extensionToken
    });
  } catch (error) {
    console.error('Failed to refresh extension token:', error);
    res.status(500).json({ error: 'Failed to refresh extension token' });
  }
};
