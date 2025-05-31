import { Handler } from '@netlify/functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import dotenv from 'dotenv';
import { getFirebaseAdmin } from './firebase-admin';

// Load environment variables
dotenv.config();

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
  getFirebaseAdmin();
}

// Interface for user data
interface UserData {
  accessToken?: string;
  workspaceId?: string;
  lastUpdated?: string;
  email?: string;
}

// Helper function to get user data by email
const getUserByEmail = async (email: string): Promise<UserData | null> => {
  try {
    const db = admin.database();
    const usersRef = db.ref('users');
    const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');

    if (snapshot.exists()) {
      const userEntries = Object.entries(snapshot.val());
      if (userEntries.length > 0) {
        const [_, userData] = userEntries[0];
        return userData as UserData;
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    throw error;
  }
};

export const handler: Handler = async (event, context) => {
  // Set CORS headers - note the specific origin instead of wildcard
  const allowedOrigins = [
    'https://canvastonotion.io',
    'https://canvastonotion.netlify.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  
  const origin = event.headers.origin || '';
  const isAllowedOrigin = allowedOrigins.includes(origin);
  
  const headers = {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
  
  try {
    // Parse the path to determine the endpoint
    const pathParts = event.path.split('/');
    const endpoint = pathParts[pathParts.length - 1];
    
    // Handle token exchange endpoint
    if (endpoint === 'token' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      return await handleTokenExchange(body, headers);
    } 
    // Handle connected endpoint
    else if (endpoint === 'connected' && event.httpMethod === 'GET') {
      const email = event.queryStringParameters?.email;
      
      if (!email) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Email is required' })
        };
      }
      
      // Get user data
      const userData = await getUserByEmail(email);
      
      if (!userData) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, connected: false, error: 'User not found' })
        };
      }
      
      // Check if accessToken exists
      const connected = !!userData.accessToken;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, connected })
      };
    } else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Not found' })
      };
    }
  } catch (error) {
    console.error('Error processing Notion request:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Function to handle Notion token exchange
async function handleTokenExchange(body: any, headers: any) {
  try {
    const { code, email } = body;
    
    if (!code || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Code and email are required' })
      };
    }
    
    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://api.notion.com/v1/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.NOTION_REDIRECT_URI!
      }).toString(),
      {
        auth: {
          username: process.env.NOTION_CLIENT_ID!,
          password: process.env.NOTION_CLIENT_SECRET!
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const { access_token, workspace_id } = tokenResponse.data;
    
    // Update the user's data in Firebase
    const db = admin.database();
    const usersRef = db.ref('users');
    const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
    
    if (snapshot.exists()) {
      const userEntries = Object.entries(snapshot.val());
      if (userEntries.length > 0) {
        const [userId] = userEntries[0];
        const userRef = db.ref(`users/${userId}`);
        
        // Update user data with Notion token
        await userRef.update({
          accessToken: access_token,
          workspaceId: workspace_id,
          lastUpdated: new Date().toISOString()
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Notion token stored successfully'
          })
        };
      }
    }
    
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'User not found' })
    };
  } catch (error) {
    console.error('Error exchanging Notion token:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to exchange Notion token',
        details: error.response?.data || error.message
      })
    };
  }
} 