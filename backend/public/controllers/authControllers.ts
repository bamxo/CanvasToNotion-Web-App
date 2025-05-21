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
  UserData
} from '../types';

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
      
      // Full success
      res.status(201).json(authResponse.data);
    } catch (dbError) {
      console.error('Database save error:', dbError);
      // Partial success - auth worked but database failed
      res.status(201).json({
        ...authResponse.data,
        warning: 'User created but profile data not saved'
      });
    }
  } catch (error) {
    console.error('Signup error:', error);
    const statusCode = axios.isAxiosError(error) ? error.response?.status || 500 : 500;
    const errorMessage = axios.isAxiosError(error) 
      ? error.response?.data?.error?.message || 'Failed to create user' 
      : 'Failed to create user';
    res.status(statusCode).json({ error: errorMessage });
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
      console.log('Generating custom token for extension...');
      // Generate a custom token for the extension
      const customToken = await admin.auth().createCustomToken(authData.localId);
      console.log('Custom token generated successfully');
      
      res.json({
        ...authData,
        extensionToken: customToken
      });
      console.log('Sent response with extension token');
    } else {
      console.log('No extension token requested');
      res.json(authData);
    }
  } catch (error) {
    console.error('Login error:', 
      axios.isAxiosError(error) ? error.response?.data : error);
    
    res.status(axios.isAxiosError(error) ? error.response?.status || 500 : 500).json({
      error: axios.isAxiosError(error) ? 
        error.response?.data?.error?.message || 'Authentication failed' : 
        'Authentication failed'
    });
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
    console.error('Password reset error:', 
      axios.isAxiosError(error) ? error.response?.data : error);
    
    res.status(axios.isAxiosError(error) ? error.response?.status || 500 : 500).json({
      error: axios.isAxiosError(error) ? 
        error.response?.data?.error?.message || 'Failed to send password reset email' : 
        'Failed to send password reset email'
    });
  }
};

// Sign in with Google ID token (after frontend Google authentication)
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken }: GoogleAuthRequest = req.body;
    
    if (!idToken) {
      res.status(400).json({ error: 'Google ID token is required' });
      return;
    }
    
    const response = await axios.post<AuthResponse>(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${firebaseConfig.apiKey}`,
      {
        postBody: `id_token=${idToken}&providerId=google.com`,
        requestUri: process.env.APP_URL || 'http://localhost:3000',
        returnSecureToken: true
      }
    );
    
    // Store user data in database if it's a new user
    if (response.data && response.data.localId) {
      const userExists = await axios.get(
        `${firebaseConfig.databaseURL}/users/${response.data.localId}.json`
      );
      
      if (!userExists.data) {
        const userData: UserData = {
          email: response.data.email,
          displayName: response.data.displayName,
          photoURL: response.data.photoUrl,
          createdAt: new Date().toISOString()
        };
        
        await axios.put(
          `${firebaseConfig.databaseURL}/users/${response.data.localId}.json`,
          userData
        );
      }
    }
    
    res.json(response.data);
  } catch (error) {
    console.error('Google auth error:', 
      axios.isAxiosError(error) ? error.response?.data : error);
    
    res.status(axios.isAxiosError(error) ? error.response?.status || 500 : 500).json({
      error: axios.isAxiosError(error) ? 
        error.response?.data?.error?.message || 'Google authentication failed' : 
        'Google authentication failed'
    });
  }
};
