import { Handler } from '@netlify/functions';
import { getFirebaseAdmin } from './firebase-admin';

// Initialize Firebase Admin
const admin = getFirebaseAdmin();

// Define allowed origins
const allowedOrigins = [
  'https://canvastonotion.netlify.app',
  'https://canvastonotion.io',
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
}; 