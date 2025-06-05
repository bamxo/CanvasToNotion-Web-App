import { Handler } from '@netlify/functions';
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import { getFirebaseAdmin } from './firebase-admin';
import axios from 'axios';

// Load environment variables
dotenv.config();

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
  getFirebaseAdmin();
}

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