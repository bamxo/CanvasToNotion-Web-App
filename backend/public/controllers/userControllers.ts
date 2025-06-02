// src/controllers/userController.ts - User profile handlers
import { Response } from 'express';
import axios from 'axios';
import firebaseConfig from '../config/firebase';
import { AuthenticatedRequest } from '../types';
import { admin } from '../config/firebase-admin';

// Get user profile
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.localId;
    
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const authToken = req.headers.authorization?.split('Bearer ')[1];
    
    if (!authToken) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    const response = await axios.get(
      `${firebaseConfig.databaseURL}/users/${userId}.json?auth=${authToken}`
    );
    
    res.json(response.data);
  } catch (error) {
    const errorMessage = axios.isAxiosError(error) ? 
      error.response?.data?.error || 'Failed to fetch profile' : 
      'Failed to fetch profile';
    res.status(axios.isAxiosError(error) ? error.response?.status || 500 : 500)
      .json({ error: errorMessage });
  }
};

// Get user info from Firebase Auth
export const getUserInfo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.localId;
    
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get user record from Firebase Admin
    const userRecord = await admin.auth().getUser(userId);
    
    res.json({
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      emailVerified: userRecord.emailVerified
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
};

// Update user profile
export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.localId;
    
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const profileData = req.body;
    
    // Remove sensitive fields if they exist
    delete profileData.password;
    
    const authToken = req.headers.authorization?.split('Bearer ')[1];
    
    if (!authToken) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    const response = await axios.patch(
      `${firebaseConfig.databaseURL}/users/${userId}.json?auth=${authToken}`,
      profileData
    );
    
    res.json(response.data);
  } catch (error) {
    const errorMessage = axios.isAxiosError(error) ? 
      error.response?.data?.error || 'Failed to update profile' : 
      'Failed to update profile';
    res.status(axios.isAxiosError(error) ? error.response?.status || 500 : 500)
      .json({ error: errorMessage });
  }
};
