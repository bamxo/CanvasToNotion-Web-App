// src/config/firebaseAdmin.ts
// Unified Firebase Admin SDK initialisation for the Vercel deployment.
// Ported from backend/netlify/functions/firebase-admin.ts so that the Express
// app and the Netlify functions initialise the Admin SDK identically.
//
// Reads the full service-account JSON from process.env.FIREBASE_SERVICE_ACCOUNT
// (a single-line JSON string) and applies the same private-key newline fixes the
// Netlify version uses. On failure it throws (it never calls process.exit).
import * as admin from 'firebase-admin';

let firebaseApp: admin.app.App | undefined;

export const getFirebaseAdmin = (): admin.app.App => {
  if (firebaseApp) {
    return firebaseApp;
  }

  // Reuse an app that another module may already have initialised.
  if (admin.apps.length) {
    firebaseApp = admin.app();
    return firebaseApp;
  }

  try {
    // Parse the Firebase service account from the environment variable.
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

    // Fix the private key format - hosting providers escape newlines differently.
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key
        .replace(/-----BEGINPRIVATEKEY-----/g, '-----BEGIN PRIVATE KEY-----')
        .replace(/-----ENDPRIVATEKEY-----/g, '-----END PRIVATE KEY-----');

      // Ensure proper newline handling.
      if (!serviceAccount.private_key.includes('\n')) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    return firebaseApp;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    console.error(
      'Service Account Issue:',
      process.env.FIREBASE_SERVICE_ACCOUNT ? 'Service account exists' : 'No service account found'
    );
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.error('Project ID:', serviceAccount.project_id);
        console.error('Private Key Format:', serviceAccount.private_key ? 'Key exists' : 'No private key');
        if (serviceAccount.private_key) {
          console.error('Private Key starts with:', serviceAccount.private_key.substring(0, 20));
        }
      } catch {
        console.error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
      }
    }
    // Never call process.exit here - let the caller handle the failure.
    throw error;
  }
};

export const getFirestore = () => {
  return getFirebaseAdmin().firestore();
};

export const getDatabase = () => {
  return getFirebaseAdmin().database();
};

export { admin };
