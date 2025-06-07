import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import { Handler } from '@netlify/functions';
import { getFirebaseAdmin } from './firebase-admin';

// Import routes
import authRoutes from '../../public/routes/auth';
import databaseRoutes from '../../public/routes/database';
import userRoutes from '../../public/routes/users';
import notionRouter from '../../public/notion_api/notionRouter';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK with service account from environment variables
if (!admin.apps.length) {
  try {
    getFirebaseAdmin();
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
}

// Create Express app
const app = express();

// Configure CORS
const allowedOrigins = [
  'https://canvastonotion.netlify.app',
  'https://canvastonotion.io',
  'http://localhost:3000',
  'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add pre-flight OPTIONS handling
app.options('*', cors());

// Middleware
app.use(bodyParser.json());

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/db', databaseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notion', notionRouter);

// Add a simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create the Netlify handler
export const handler: Handler = async (event, context) => {
  // Return a 200 response for OPTIONS requests (pre-flight CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: '',
    };
  }

  try {
    // For non-OPTIONS requests, route the request to the appropriate handler
    if (event.path.startsWith('/.netlify/functions/api/health')) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
      };
    }

    // For API routes
    if (event.path.startsWith('/.netlify/functions/api/api/')) {
      // Call the appropriate handler based on the path
      
      // Special handling for google auth and delete-account
      if (event.path.includes('/api/auth/google')) {
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            redirect: true, 
            url: '/.netlify/functions/google',
            method: 'POST' 
          }),
        };
      } else if (event.path.includes('/api/auth/delete-account')) {
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            redirect: true, 
            url: '/.netlify/functions/delete-account',
            method: 'POST' 
          }),
        };
      } else if (event.path.includes('/api/auth/')) {
        // Handle other auth routes
        return {
          statusCode: 200,
          body: JSON.stringify({ route: 'auth', path: event.path }),
        };
      } else if (event.path.includes('/api/db/')) {
        // Handle database routes
        return {
          statusCode: 200,
          body: JSON.stringify({ route: 'database', path: event.path }),
        };
      } else if (event.path.includes('/api/users/')) {
        // Handle user routes
        return {
          statusCode: 200,
          body: JSON.stringify({ route: 'user', path: event.path }),
        };
      } else if (event.path.includes('/api/notion/')) {
        // Handle notion routes
        return {
          statusCode: 200,
          body: JSON.stringify({ route: 'notion', path: event.path }),
        };
      }
    }

    // Default response for unhandled routes
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}; 