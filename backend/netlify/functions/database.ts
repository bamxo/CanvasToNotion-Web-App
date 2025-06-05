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
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
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
  
  // Extract path parameter
  const pathParam = event.path.split('/').pop();
  if (!pathParam) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Path parameter is required' })
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
  const ref = db.ref(`users/${userId}/${pathParam}`);
  
  try {
    // Handle different HTTP methods
    switch (event.httpMethod) {
      case 'GET':
        return await handleGetData(ref, headers);
      
      case 'PUT':
        const putData = JSON.parse(event.body || '{}');
        return await handleUpdateData(ref, putData, headers);
      
      case 'DELETE':
        return await handleDeleteData(ref, headers);
      
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Database operation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Function to handle GET request (read data)
async function handleGetData(ref: admin.database.Reference, headers: any) {
  try {
    const snapshot = await ref.once('value');
    const data = snapshot.val();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        data: data || null 
      })
    };
  } catch (error) {
    console.error('Error reading data:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Failed to read data' 
      })
    };
  }
}

// Function to handle PUT request (update data)
async function handleUpdateData(ref: admin.database.Reference, data: any, headers: any) {
  try {
    await ref.update(data);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Data updated successfully' 
      })
    };
  } catch (error) {
    console.error('Error updating data:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Failed to update data' 
      })
    };
  }
}

// Function to handle DELETE request (delete data)
async function handleDeleteData(ref: admin.database.Reference, headers: any) {
  try {
    await ref.remove();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Data deleted successfully' 
      })
    };
  } catch (error) {
    console.error('Error deleting data:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Failed to delete data' 
      })
    };
  }
} 