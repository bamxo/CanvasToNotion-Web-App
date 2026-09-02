// src/db.ts
// Realtime Database handle for the Express app.
// The service account is now read from process.env.FIREBASE_SERVICE_ACCOUNT via
// the unified initialiser - no serviceAccountKey.json disk read, no process.exit.
import dotenv from 'dotenv';
import { getFirebaseAdmin } from './config/firebaseAdmin';

dotenv.config();

export const adminDb = getFirebaseAdmin().database();
