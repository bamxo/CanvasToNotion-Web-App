// src/config/firebase.ts - Firebase configuration
import dotenv from 'dotenv';
import { FirebaseConfig } from '../types';

dotenv.config();

const apiKey = process.env.FIREBASE_API_KEY;
const projectId = process.env.FIREBASE_PROJECT_ID;

if (!apiKey || !projectId) {
  throw new Error('Missing required Firebase configuration in environment variables.');
}

const config: FirebaseConfig = {
  apiKey,
  projectId,
  databaseURL: process.env.FIREBASE_DATABASE_URL || 
    `https://${projectId}-default-rtdb.firebaseio.com`
};

export default config;
