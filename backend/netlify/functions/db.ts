import * as admin from 'firebase-admin';
import { getFirebaseAdmin } from './firebase-admin';

// Get the admin database instance
const adminDb = getFirebaseAdmin().database();

export { adminDb }; 