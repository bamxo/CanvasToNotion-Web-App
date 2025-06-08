import { Handler } from '@netlify/functions';
import * as admin from 'firebase-admin';
import { getFirebaseAdmin } from './firebase-admin';

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

// Verify the ID token from the Authorization header
const verifyToken = async (authHeader: string | undefined): Promise<{ email: string; uid: string } | null> => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return {
      email: decodedToken.email || '',
      uid: decodedToken.uid
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
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
  
  // Only allow POST requests for this endpoint
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
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
}; 