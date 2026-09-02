// src/config/firebase-admin.ts
// Backwards-compatible shim. The real initialisation now lives in
// ./firebaseAdmin.ts (reads FIREBASE_SERVICE_ACCOUNT from the environment).
// Existing importers (authControllers.ts, userControllers.ts) still do
//   import { admin } from '../config/firebase-admin'
// so keep the named `admin` export working.
import * as admin from 'firebase-admin';
import { getFirebaseAdmin } from './firebaseAdmin';

getFirebaseAdmin();

export { admin };
