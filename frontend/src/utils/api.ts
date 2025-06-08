/**
 * API Endpoints Utility
 * 
 * This file manages the API endpoints for the application,
 * automatically switching between local development and production endpoints.
 */

// Determine if we're in production or development
const isProduction = import.meta.env.PROD;

// Base URLs
const LOCAL_API_BASE = 'http://localhost:3000/api';
const PRODUCTION_API_BASE = 'https://canvastonotion.netlify.app/.netlify/functions';

// Special frontend auth user endpoint (development only)
const LOCAL_AUTH_USER_ENDPOINT = 'http://localhost:5173/api/auth/user';
const PRODUCTION_AUTH_USER_ENDPOINT = `${PRODUCTION_API_BASE}/auth/user`;

// Get the appropriate base URL based on environment
export const API_BASE = isProduction ? PRODUCTION_API_BASE : LOCAL_API_BASE;

// Auth endpoints
export const AUTH_ENDPOINTS = {
  SIGNUP: `${API_BASE}/auth/signup`,
  LOGIN: `${API_BASE}/auth/login`,
  FORGOT_PASSWORD: `${API_BASE}/auth/forgot-password`,
  GOOGLE: `${API_BASE}/auth/google`,
  USER: isProduction ? PRODUCTION_AUTH_USER_ENDPOINT : LOCAL_AUTH_USER_ENDPOINT,
  DELETE_ACCOUNT: `${API_BASE}/auth/delete-account`,
  REFRESH_EXTENSION_TOKEN: `${API_BASE}/auth/refresh-extension-token`,
};

// User endpoints
export const USER_ENDPOINTS = {
  PROFILE: `${API_BASE}/user/profile`,
  INFO: `${API_BASE}/users/info`,
};

// Database endpoints
export const DB_ENDPOINTS = {
  DATA: (path: string) => `${API_BASE}/db/${path}`,
};

// Notion endpoints
export const NOTION_ENDPOINTS = {
  TOKEN: `${API_BASE}/notion/token`,
  SYNC: `${API_BASE}/notion/sync`,
  CONNECTED: `${API_BASE}/notion/connected`,
  DISCONNECT: `${API_BASE}/notion/disconnect`,
  COMPARE: `${API_BASE}/notion/compare`,
};

// Health check endpoint
export const HEALTH_ENDPOINT = isProduction 
  ? 'https://canvastonotion.netlify.app/.netlify/functions/api/health'
  : `${LOCAL_API_BASE.replace('/api', '')}/health`; 

// Credential settings for cross-origin requests
export const USE_CREDENTIALS = isProduction; 