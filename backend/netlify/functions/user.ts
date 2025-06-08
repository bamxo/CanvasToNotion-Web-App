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
  const allowedOrigins = [
    'https://canvastonotion.io',
    'https://canvastonotion.netlify.app',
    'https://api.canvastonotion.io',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  
  const origin = event.headers.origin || '';
  const isAllowedOrigin = allowedOrigins.includes(origin);
  
  const headers = {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
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
  const db = admin.database();
  const userRef = db.ref(`users/${userId}/profile`);
  
  try {
    // Handle different HTTP methods
    switch (event.httpMethod) {
      case 'GET':
        return await handleGetProfile(userRef, headers);
      
      case 'PUT':
        const profileData = JSON.parse(event.body || '{}');
        return await handleUpdateProfile(userRef, profileData, headers);
      
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('User profile operation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Function to handle GET request (get user profile)
async function handleGetProfile(ref: admin.database.Reference, headers: any) {
  try {
    const snapshot = await ref.once('value');
    const profile = snapshot.val() || {};
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        profile 
      })
    };
  } catch (error) {
    console.error('Error getting profile:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Failed to get profile' 
      })
    };
  }
}

// Function to handle PUT request (update user profile)
async function handleUpdateProfile(ref: admin.database.Reference, data: any, headers: any) {
  try {
    // Remove any sensitive or disallowed fields
    const { email, uid, ...allowedData } = data;
    
    await ref.update(allowedData);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Profile updated successfully' 
      })
    };
  } catch (error) {
    console.error('Error updating profile:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Failed to update profile' 
      })
    };
  }
} 