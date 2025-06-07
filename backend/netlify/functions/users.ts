import { Handler } from '@netlify/functions';
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import { getFirebaseAdmin } from './firebase-admin';

// Load environment variables
dotenv.config();

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
  getFirebaseAdmin();
}

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // Handle OPTIONS request (pre-flight CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  // Check path for the /info endpoint
  const path = event.path.replace('/.netlify/functions/users', '');
  
  if (path !== '/info' && path !== '') {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };
  }
  
  // Verify authentication
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Authentication required' })
    };
  }
  
  const token = authHeader.split('Bearer ')[1];
  let decodedToken;
  
  try {
    decodedToken = await admin.auth().verifyIdToken(token);
  } catch (error) {
    console.error('Invalid token:', error);
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Invalid token' })
    };
  }
  
  const userId = decodedToken.uid;
  
  try {
    // Get user info from Firebase Auth
    const userRecord = await admin.auth().getUser(userId);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified
      })
    };
  } catch (error) {
    console.error('Error fetching user info:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch user info' })
    };
  }
}; 