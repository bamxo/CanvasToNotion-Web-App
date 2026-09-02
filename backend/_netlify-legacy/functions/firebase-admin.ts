import * as admin from 'firebase-admin';

let firebaseApp: admin.app.App | undefined;

export const getFirebaseAdmin = (): admin.app.App => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Parse the Firebase service account from environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    
    // Fix the private key format - Netlify escapes newlines differently
    if (serviceAccount.private_key) {
      // Replace "-----BEGINPRIVATEKEY-----" with "-----BEGIN PRIVATE KEY-----"
      // and "-----ENDPRIVATEKEY-----" with "-----END PRIVATE KEY-----"
      serviceAccount.private_key = serviceAccount.private_key
        .replace(/-----BEGINPRIVATEKEY-----/g, '-----BEGIN PRIVATE KEY-----')
        .replace(/-----ENDPRIVATEKEY-----/g, '-----END PRIVATE KEY-----');
      
      // Ensure proper newline handling
      if (!serviceAccount.private_key.includes('\n')) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
    }
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    
    return firebaseApp;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    console.error('Service Account Issue:', process.env.FIREBASE_SERVICE_ACCOUNT ? 'Service account exists' : 'No service account found');
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.error('Project ID:', serviceAccount.project_id);
      console.error('Private Key Format:', serviceAccount.private_key ? 'Key exists' : 'No private key');
      if (serviceAccount.private_key) {
        console.error('Private Key starts with:', serviceAccount.private_key.substring(0, 20));
      }
    }
    throw error;
  }
};

export const getFirestore = () => {
  return getFirebaseAdmin().firestore();
};

export const getDatabase = () => {
  return getFirebaseAdmin().database();
}; 