import { Handler } from '@netlify/functions';
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import { getFirebaseAdmin } from './firebase-admin';
import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';

// Load environment variables
dotenv.config();

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
  getFirebaseAdmin();
}

// Get Google client ID from environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
console.log('Google Client ID environment variable:', {
  exists: !!GOOGLE_CLIENT_ID,
  length: GOOGLE_CLIENT_ID?.length || 0,
  prefix: GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.substring(0, 8) + '...' : 'undefined'
});
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Configure allowed origins
const ALLOWED_ORIGINS = [
  'https://canvastonotion.io',
  'https://canvastonotion.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

// Function to set CORS headers based on the origin
const getCorsHeaders = (origin?: string) => {
  // Default headers
  const headers = {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };

  // If no origin or origin is not in allowed list, don't set the header
  if (!origin) {
    return headers;
  }

  // Check if the origin is allowed
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      ...headers,
      'Access-Control-Allow-Origin': origin
    };
  }

  // For development, if it's a localhost origin not in our predefined list
  if (origin.startsWith('http://localhost:')) {
    return {
      ...headers,
      'Access-Control-Allow-Origin': origin
    };
  }

  // Default case - don't set origin header if not allowed
  return headers;
};

export const handler: Handler = async (event, context) => {
  // Get the origin from the request headers
  const origin = event.headers.origin || event.headers.Origin;
  
  // Get CORS headers based on origin
  const headers = getCorsHeaders(origin);
  
  // Handle OPTIONS request (pre-flight CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204, // No content for OPTIONS
      headers,
      body: ''
    };
  }
  
  // Handle GET request for user info
  if (event.httpMethod === 'GET' && event.path.endsWith('/user')) {
    return handleGetUser(event, headers);
  }
  
  // Handle refresh-extension-token endpoint
  if (event.httpMethod === 'POST' && event.path.endsWith('/refresh-extension-token')) {
    return handleRefreshExtensionToken(event, headers);
  }
  
  // Only allow POST requests for auth endpoints
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    const path = event.path.split('/').pop();
    const body = JSON.parse(event.body || '{}');
    
    // Handle different authentication endpoints
    switch (path) {
      case 'signup':
        return handleSignup(body, headers);
      case 'login':
        return handleLogin(body, headers);
      case 'forgot-password':
        return handleForgotPassword(body, headers);
      case 'google':
        return handleGoogleAuth(body, headers);
      case 'delete-account':
        return handleDeleteAccount(body, headers);
      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Not found' })
        };
    }
  } catch (error) {
    console.error('Error processing authentication request:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Function to handle user signup
async function handleSignup(body: any, headers: any) {
  try {
    const { email, password, displayName } = body;
    
    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and password are required' })
      };
    }
    
    // Get Firebase API key
    const firebaseApiKey = process.env.FIREBASE_API_KEY;
    if (!firebaseApiKey) {
      console.error('FIREBASE_API_KEY not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }
    
    // 1. Create user in Firebase Auth using Admin SDK
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0]
    });
    
    console.log('User created in Firebase Auth:', userRecord.uid);
    
    // 2. Get ID token via REST API
    const authResponse = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
      { 
        email, 
        password,
        returnSecureToken: true 
      }
    );
    
    // 3. Save user data to Firebase Realtime Database
    try {
      // Create user data object
      const userData = {
        email,
        displayName: displayName || email.split('@')[0],
        createdAt: new Date().toISOString()
      };
      
      // Get database reference and save data
      const db = admin.database();
      await db.ref(`users/${userRecord.uid}`).set(userData);
      
      console.log('User data saved to database for user:', userRecord.uid);
      
      // Return full success response with auth data
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          idToken: authResponse.data.idToken,
          email: authResponse.data.email,
          refreshToken: authResponse.data.refreshToken,
          expiresIn: authResponse.data.expiresIn,
          localId: userRecord.uid,
          displayName: userData.displayName
        })
      };
    } catch (dbError) {
      console.error('Database save error:', dbError);
      
      // Return partial success - auth worked but database failed
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          idToken: authResponse.data.idToken,
          email: authResponse.data.email,
          refreshToken: authResponse.data.refreshToken,
          expiresIn: authResponse.data.expiresIn,
          localId: userRecord.uid,
          warning: 'User created but profile data not saved'
        })
      };
    }
  } catch (error) {
    console.error('Signup error:', error);
    
    // Format error response
    let statusCode = 400;
    let errorMessage = 'Failed to create user';
    
    if (axios.isAxiosError(error) && error.response) {
      statusCode = error.response.status;
      errorMessage = error.response.data?.error?.message || 'Failed to create user';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: errorMessage
      })
    };
  }
}

// Function to handle user login
async function handleLogin(body: any, headers: any) {
  try {
    const { email, password, requestExtensionToken } = body;
    
    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and password are required' })
      };
    }
    
    // Authenticate with Firebase using the Firebase REST API
    const firebaseApiKey = process.env.FIREBASE_API_KEY;
    if (!firebaseApiKey) {
      console.error('FIREBASE_API_KEY not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }
    
    // Sign in with email/password using Firebase Auth REST API
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
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
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          idToken: authData.idToken,
          refreshToken: authData.refreshToken,
          expiresIn: authData.expiresIn,
          localId: authData.localId,
          email: authData.email,
          extensionToken: customToken
        })
      };
    } else {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(authData)
      };
    }
  } catch (error) {
    console.error('Login error:', error);
    
    // Format error response
    let statusCode = 400;
    let errorMessage = 'Authentication failed';
    
    // Extract error details if available
    if (axios.isAxiosError(error) && error.response) {
      statusCode = error.response.status;
      errorMessage = error.response.data?.error?.message || 'Authentication failed';
    }
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: errorMessage
      })
    };
  }
}

// Function to handle forgot password
async function handleForgotPassword(body: any, headers: any) {
  try {
    const { email } = body;
    
    // Generate password reset link
    const link = await admin.auth().generatePasswordResetLink(email);
    
    // In a real implementation, you would send this link via email
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Password reset link generated',
        // Don't return the actual link in production
        link: process.env.NODE_ENV === 'development' ? link : undefined
      })
    };
  } catch (error) {
    console.error('Error generating password reset link:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate password reset link',
        details: error.message 
      })
    };
  }
}

// Function to handle getting user info by token
async function handleGetUser(event: any, headers: any) {
  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization header is required' })
      };
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    const firebaseApiKey = process.env.FIREBASE_API_KEY;
    
    if (!firebaseApiKey) {
      console.error('FIREBASE_API_KEY not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }
    
    // Verify token with Firebase Auth
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
      { idToken }
    );
    
    // Return user info
    if (response.data && response.data.users && response.data.users.length > 0) {
      const user = response.data.users[0];
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          email: user.email,
          firstName: user.displayName ? user.displayName.split(' ')[0] : undefined,
          displayName: user.displayName,
          photoURL: user.photoUrl
        })
      };
    } else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }
  } catch (error) {
    console.error('Error getting user info:', error);
    let errorMessage = 'Invalid token';
    
    if (axios.isAxiosError(error) && error.response) {
      console.error('Firebase response:', error.response.data);
      errorMessage = error.response.data?.error?.message || 'Invalid token';
    }
    
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: errorMessage })
    };
  }
}

// Function to handle Google authentication
async function handleGoogleAuth(body: any, headers: any) {
  try {
    const { idToken, requestExtensionToken } = body;
    console.log('Google auth request received with token length:', idToken?.length || 0);
    console.log('Google Client ID environment variable exists:', !!GOOGLE_CLIENT_ID);
    console.log('Google Client ID length:', GOOGLE_CLIENT_ID.length);

    if (!idToken) {
      console.log('Missing Google ID token in request');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Google ID token is required' }),
      };
    }

    // 1. Verify Google ID token
    let payload;
    let verificationError = null;
    
    try {
      console.log('Attempting to verify Google token...');
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
      console.log('Google token verified successfully for email:', payload?.email);
    } catch (err) {
      verificationError = err;
      console.error('Google token verification error details:', {
        message: err.message,
        stack: err.stack,
        clientId: GOOGLE_CLIENT_ID.substring(0, 10) + '...' // Only log part of the client ID for security
      });
      
      // Try an alternative verification approach
      try {
        console.log('Attempting alternate token validation...');
        // Make a request to Google's token info endpoint
        const tokenInfoResponse = await axios.get(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
        );
        
        if (tokenInfoResponse.status === 200 && tokenInfoResponse.data.email) {
          console.log('Alternative token validation succeeded for email:', tokenInfoResponse.data.email);
          payload = tokenInfoResponse.data;
        } else {
          console.log('Alternative token validation failed:', tokenInfoResponse.status);
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ 
              error: 'Invalid Google ID token', 
              details: err.message,
              alternativeValidation: 'failed'
            }),
          };
        }
      } catch (altErr) {
        console.error('Alternative token validation error:', altErr.message);
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid Google ID token', 
            details: err.message,
            alternativeError: altErr.message
          }),
        };
      }
    }
    
    if (!payload || !payload.email) {
      console.log('Invalid payload received from Google token verification');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid Google token payload' }),
      };
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
        console.error('Error creating user profile:', dbError);
        // Continue even if database save fails
      }
    }

    // 3. Create Firebase custom token for extension
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    // 4. Exchange Google ID token for Firebase ID token
    const firebaseApiKey = process.env.FIREBASE_API_KEY || '';
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${firebaseApiKey}`,
      {
        postBody: `id_token=${idToken}&providerId=google.com`,
        requestUri: 'http://localhost',
        returnSecureToken: true
      }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        idToken: response.data.idToken,
        customToken,
        ...(requestExtensionToken ? { extensionToken: customToken } : {}),
        email: payload.email,
        photoURL: payload.picture,
      }),
    };
  } catch (error) {
    console.error('Google authentication error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Google authentication failed' }),
    };
  }
}

// Function to handle account deletion
async function handleDeleteAccount(body: any, headers: any) {
  try {
    const { idToken } = body;
    
    if (!idToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'ID token is required' }),
      };
    }

    // Verify the token and get user info
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Delete user data from database
    try {
      await admin.database().ref(`/users/${uid}`).remove();
    } catch (dbError) {
      console.error('Error deleting user data from database:', dbError);
      // Continue with auth deletion even if database deletion fails
    }

    // Delete user from Firebase Auth
    await admin.auth().deleteUser(uid);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Account deleted successfully' }),
    };
  } catch (error) {
    console.error('Account deletion error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to delete account' }),
    };
  }
}

// Add the refresh extension token handler function
async function handleRefreshExtensionToken(event: any, headers: any) {
  try {
    // Extract authorization header
    const authHeader = event.headers.authorization || event.headers.Authorization;
    
    // Verify the token and get user info
    const user = await verifyToken(authHeader);
    
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'User not authenticated' })
      };
    }
    
    // Generate a new custom token for the extension
    const extensionToken = await admin.auth().createCustomToken(user.uid);
    
    // Return the new token
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        extensionToken
      })
    };
    
  } catch (error) {
    console.error('Failed to refresh extension token:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to refresh extension token' })
    };
  }
}

// Interface for authenticated request
export interface AuthenticatedRequest {
  user?: {
    email: string;
    uid: string;
  };
  headers: {
    authorization?: string;
  };
}

// Verify Firebase ID token
export const verifyToken = async (authHeader: string | undefined): Promise<{ email: string; uid: string } | null> => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (!decodedToken.email) {
      return null;
    }
    
    return {
      email: decodedToken.email,
      uid: decodedToken.uid
    };
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
}; 