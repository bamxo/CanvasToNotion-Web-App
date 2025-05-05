// src/db.ts
import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
// Load service account key
let serviceAccount;
try {
  // Adjust the path to the serviceAccountKey.json location
  const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');  // Adjusted path
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} catch (error) {
  console.error('Error loading Firebase service account:', error);
  process.exit(1);
}

// Initialize Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      }); 
}

const adminDb = admin.database();

export { adminDb };
