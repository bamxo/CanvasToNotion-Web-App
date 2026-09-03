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
const PRODUCTION_API_BASE = 'https://api2.canvastonotion.io';

// Optional override: point the running UI at any deployed backend (e.g. a Vercel
// URL) without changing code. Set VITE_API_BASE in frontend/.env.local — it wins
// over the prod/local switch below and applies in `npm run dev` too. Trailing
// slash is trimmed. Example: VITE_API_BASE=https://c2n-backend.vercel.app
const OVERRIDE_API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)
  ?.trim()
  .replace(/\/+$/, '');

// Special frontend auth user endpoint (development only)
const LOCAL_AUTH_USER_ENDPOINT = 'http://localhost:3000/api/auth/user';
const PRODUCTION_AUTH_USER_ENDPOINT = `${PRODUCTION_API_BASE}/auth/user`;

// Get the appropriate base URL based on environment (override wins if set)
export const API_BASE =
  OVERRIDE_API_BASE || (isProduction ? PRODUCTION_API_BASE : LOCAL_API_BASE);

// True when VITE_API_BASE points the app at a backend on a different site than
// this frontend (e.g. `npm run dev:vercel` → localhost UI + Vercel backend).
// In that setup the `isAuthenticated` cookie is set for a domain this page
// can't read via document.cookie, so cookie-gated auth checks must fall back
// to the bearer token alone. Always false in a normal production build.
export const IS_CROSS_ORIGIN_BACKEND = !!OVERRIDE_API_BASE;

// Auth endpoints
export const AUTH_ENDPOINTS = {
  SIGNUP: `${API_BASE}/auth/signup`,
  LOGIN: `${API_BASE}/auth/login`,
  FORGOT_PASSWORD: `${API_BASE}/auth/forgot-password`,
  RESET_PASSWORD: `${API_BASE}/auth/reset-password`,
  GOOGLE: `${API_BASE}/auth/google`,
  USER: OVERRIDE_API_BASE
    ? `${OVERRIDE_API_BASE}/auth/user`
    : isProduction
      ? PRODUCTION_AUTH_USER_ENDPOINT
      : LOCAL_AUTH_USER_ENDPOINT,
  DELETE_ACCOUNT: `${API_BASE}/auth/delete-account`,
  REFRESH_EXTENSION_TOKEN: `${API_BASE}/auth/refresh-extension-token`,
  LOGOUT: `${API_BASE}/auth/logout`,
};

// Cookie state endpoints
export const COOKIE_STATE_ENDPOINTS = {
  SET_AUTHENTICATED: `${API_BASE}/cookie-state/set-authenticated`,
  CLEAR_AUTHENTICATED: `${API_BASE}/cookie-state/clear-authenticated`,
};

// User endpoints
export const USER_ENDPOINTS = {
  PROFILE: `${API_BASE}/users/profile`,
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
  SYNC_V2: `${API_BASE}/notion/sync-v2`,
  SYNC_STATUS: `${API_BASE}/notion/sync-status`,
  PAGES: `${API_BASE}/notion/pages`,
};

// Contact form endpoint
// Resolves to `/api/contact` locally (alias mount) and `/contact` in production.
export const CONTACT_ENDPOINT = `${API_BASE}/contact`;

// Health check endpoint
// Resolves to `/api/health` locally (alias mount) and `/health` in production.
export const HEALTH_ENDPOINT = `${API_BASE}/health`;

// Credential settings for cross-origin requests
export const USE_CREDENTIALS = true; // Always send credentials 