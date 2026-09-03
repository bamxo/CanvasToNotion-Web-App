// src/types.ts - Type definitions
import { Request } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';

// Firebase configuration
export interface FirebaseConfig {
  apiKey: string;
  projectId: string;
  databaseURL: string;
}

// Pricing / subscription tier.
//   free    - new sign-ups; ad-supported
//   pro     - paid monthly, no ads + upcoming extras (Stripe)
//   lifetime- one-time payment, no ads + upcoming extras (Stripe)
//   legacy  - every user that existed before the pricing model launched
export type UserTier = 'free' | 'pro' | 'lifetime' | 'legacy';

// Tier assigned to brand-new sign-ups.
export const DEFAULT_NEW_USER_TIER: UserTier = 'free';

// Tier back-filled onto every pre-existing user.
export const LEGACY_TIER: UserTier = 'legacy';

// User related types
export interface UserData {
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  tier?: UserTier;
  [key: string]: any; // For additional custom fields
}

export interface FirebaseUser {
  localId: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  emailVerified: boolean;
  [key: string]: any;
}

// Shape of req.user after the verifyToken middleware runs (Admin SDK decoded token).
// Controllers MUST read `req.user.uid` - NOT `req.user.localId`.
export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified?: boolean;
}

// Auth related types
export interface SignupRequest {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  requestExtensionToken?: boolean;
}

export interface GoogleAuthRequest {
  idToken: string;
  requestExtensionToken?: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface RefreshExtensionTokenRequest {
  idToken: string;
}

export interface AuthResponse {
  idToken: string;
  email: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  registered?: boolean;
  displayName?: string;
  photoUrl?: string;
}

// Express request with user
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Database request params
export interface DatabasePathParams extends ParamsDictionary {
  path: string;
}

export interface FirebaseError {
  error?: {
    message?: string;
    code?: number;
  };
}

export function isFirebaseError(error: unknown): error is FirebaseError {
  return typeof error === 'object' && error !== null && 'error' in error;
}