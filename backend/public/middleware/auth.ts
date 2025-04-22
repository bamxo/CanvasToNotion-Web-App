// src/middleware/auth.ts - Token verification middleware
import { Response, NextFunction } from 'express';
import axios from 'axios';
import firebaseConfig from '../config/firebase';
import { AuthenticatedRequest, FirebaseUser } from '../types';

export const verifyToken = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const idToken = authHeader?.split('Bearer ')[1];
    
    if (!idToken) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    const response = await axios.post<{ users: FirebaseUser[] }>(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
      { idToken }
    );
    
    if (response.data && response.data.users && response.data.users.length > 0) {
      req.user = response.data.users[0];
      next();
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Token verification error:', 
      axios.isAxiosError(error) ? error.response?.data : error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};
