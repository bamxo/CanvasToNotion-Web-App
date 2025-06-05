// src/types.ts - Type definitions
import { Request } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';

// Firebase configuration
export interface FirebaseConfig {
  apiKey: string;
  projectId: string;
  databaseURL: string;
}

// User related types
export interface UserData {
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  extensionId?: string;
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
  extensionId?: string;
}

export interface GoogleAuthRequest {
  idToken: string;
  requestExtensionToken?: boolean;
  extensionId?: string;
}

export interface PasswordResetRequest {
  email: string;
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
  user?: FirebaseUser;
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