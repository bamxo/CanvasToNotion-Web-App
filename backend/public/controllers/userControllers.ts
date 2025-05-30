// src/controllers/userController.ts - User profile handlers
import { Response } from 'express';
import axios from 'axios';
import firebaseConfig from '../config/firebase';
import { AuthenticatedRequest } from '../types';

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
    console.error('Profile fetch error:', 
      axios.isAxiosError(error) ? error.response?.data : error);
    
    res.status(axios.isAxiosError(error) ? error.response?.status || 500 : 500).json({
      error: axios.isAxiosError(error) ? 
        error.response?.data?.error || 'Failed to fetch profile' : 
        'Failed to fetch profile'
    });
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
    console.error('Profile update error:', 
      axios.isAxiosError(error) ? error.response?.data : error);
    
    res.status(axios.isAxiosError(error) ? error.response?.status || 500 : 500).json({
      error: axios.isAxiosError(error) ? 
        error.response?.data?.error || 'Failed to update profile' : 
        'Failed to update profile'
    });
  }
};
