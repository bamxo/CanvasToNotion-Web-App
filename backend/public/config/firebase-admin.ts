import * as admin from 'firebase-admin';
import serviceAccount from '../../serviceAccountKey.json'; // Adjust path as needed

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL 
  });
}

export { admin };