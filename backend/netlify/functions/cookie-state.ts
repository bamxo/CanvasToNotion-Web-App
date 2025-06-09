import { Handler } from '@netlify/functions';
import { getFirebaseAdmin } from './firebase-admin';

// Initialize Firebase Admin
const admin = getFirebaseAdmin();

// Define allowed origins
const allowedOrigins = [
  'https://canvastonotion.netlify.app',
  'https://canvastonotion.io',
  'https://api.canvastonotion.io',
  'http://localhost:3000',
  'http://localhost:5173'
];

// Helper function to set CORS headers
const getCorsHeaders = (origin: string | undefined) => {
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };
};

// Helper function to set isAuthenticated cookie
const setIsAuthenticatedCookie = (headers: any) => {
  // Create the Set-Cookie header
  const cookieAttributes = [
    `isAuthenticated=true`,
    'Path=/',
    'Secure',
    'SameSite=None',
    'Domain=.canvastonotion.io' // Always set domain for production
  ];
  
  // Add the Set-Cookie header to existing headers
  return {
    ...headers,
    'Set-Cookie': cookieAttributes.join('; ')
  };
};

// Helper function to clear isAuthenticated cookie
const clearIsAuthenticatedCookie = (headers: any) => {
  // Create clear cookie header
  const clearCookieHeader = [
    'isAuthenticated=',
    'Path=/',
    'Secure',
    'SameSite=None',
    'Domain=.canvastonotion.io', // Always set domain for production
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ];
  
  // Add the Set-Cookie header to existing headers to clear the cookie
  return {
    ...headers,
    'Set-Cookie': clearCookieHeader.join('; ')
  };
};

// Verify Firebase ID token from authorization header
const verifyToken = async (authHeader: string | undefined): Promise<{ uid: string } | null> => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return {
      uid: decodedToken.uid
    };
  } catch (error) {
    console.error('Error verifying auth token:', error);
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
    
    // Handle different authentication endpoints
    switch (path) {
      case 'set-authenticated':
        return handleSetAuthenticated(event, headers);
      case 'clear-authenticated':
        return handleClearAuthenticated(headers);
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

// Function to handle setting isAuthenticated cookie
async function handleSetAuthenticated(event: any, headers: any) {
  try {
    // Verify authentication token from header
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const user = await verifyToken(authHeader);
    
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }
    
    // Set isAuthenticated cookie
    const headersWithCookie = setIsAuthenticatedCookie(headers);
    
    return {
      statusCode: 200,
      headers: headersWithCookie,
      body: JSON.stringify({ success: true, message: 'Authentication cookie set' })
    };
  } catch (error) {
    console.error('Error setting authentication cookie:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to set authentication cookie' })
    };
  }
}

// Function to handle clearing isAuthenticated cookie
async function handleClearAuthenticated(headers: any) {
  try {
    // Clear isAuthenticated cookie
    const headersWithClearedCookie = clearIsAuthenticatedCookie(headers);
    
    return {
      statusCode: 200,
      headers: headersWithClearedCookie,
      body: JSON.stringify({ success: true, message: 'Authentication cookie cleared' })
    };
  } catch (error) {
    console.error('Error clearing authentication cookie:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to clear authentication cookie' })
    };
  }
} 