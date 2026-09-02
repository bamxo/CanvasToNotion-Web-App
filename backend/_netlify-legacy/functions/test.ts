import { Handler } from '@netlify/functions';

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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

  // Check for environment variables (sanitize sensitive values)
  const envVars = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 
      `${process.env.GOOGLE_CLIENT_ID.substring(0, 8)}...` : 'not set',
    VITE_GOOGLE_CLIENT_ID: process.env.VITE_GOOGLE_CLIENT_ID ? 
      `${process.env.VITE_GOOGLE_CLIENT_ID.substring(0, 8)}...` : 'not set',
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY ? 
      `${process.env.FIREBASE_API_KEY.substring(0, 5)}...` : 'not set',
    NODE_ENV: process.env.NODE_ENV || 'not set',
    NETLIFY: process.env.NETLIFY || 'not set',
  };

  // Return a success response for all requests to verify the function is working
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Test function is working!',
      timestamp: new Date().toISOString(),
      environment: envVars,
      event: {
        path: event.path,
        httpMethod: event.httpMethod,
        headers: event.headers,
        queryStringParameters: event.queryStringParameters
      }
    }),
  };
}; 