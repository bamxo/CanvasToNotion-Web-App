import { Handler } from '@netlify/functions';
import { getFirebaseAdmin } from './firebase-admin';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';

// Initialize Firebase Admin
const admin = getFirebaseAdmin();

// Get Google client ID from environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Define allowed origins
const allowedOrigins = [
  'https://canvastonotion.netlify.app',
  'https://canvastonotion.io',
  'https://api.canvastonotion.io',
  'http://localhost:3000',
  'http://localhost:5173'
];

export const handler: Handler = async (event, context) => {
  // Set CORS headers with appropriate origin
  const origin = event.headers.origin || '';
  const isAllowedOrigin = allowedOrigins.includes(origin) || !origin;
  
  const headers = {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin || '*' : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };

  // Handle OPTIONS request (preflight CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only handle POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { idToken, requestExtensionToken } = body;

    if (!idToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Google ID token is required' }),
      };
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
      console.error('Google token verification error:', err);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid Google ID token' }),
      };
    }
    if (!payload || !payload.email) {
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
}; 